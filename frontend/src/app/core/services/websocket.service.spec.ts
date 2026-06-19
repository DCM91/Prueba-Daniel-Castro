import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';
import { WebSocketService } from './websocket.service';

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  url: string;
  readyState = 0;
  sent: string[] = [];
  listeners: Record<string, Array<(ev: unknown) => void>> = {};

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  addEventListener(name: string, fn: (ev: unknown) => void): void {
    (this.listeners[name] ??= []).push(fn);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = 3;
    this.dispatch('close', {});
  }

  dispatch(name: string, payload: unknown): void {
    for (const fn of this.listeners[name] ?? []) fn(payload);
  }
}

const originalWebSocket = (globalThis as { WebSocket?: unknown }).WebSocket;
(globalThis as unknown as { WebSocket: unknown }).WebSocket = FakeWebSocket as unknown as typeof WebSocket;
(global as unknown as { WebSocket: unknown }).WebSocket = FakeWebSocket as unknown as typeof WebSocket;

describe('WebSocketService', () => {
  let authMock: { getToken: jest.Mock; currentUser: () => unknown };

  beforeEach(() => {
    FakeWebSocket.instances = [];
    authMock = { getToken: jest.fn().mockReturnValue(null), currentUser: () => ({ id: 1, role: 'client' }) };
  });

  afterAll(() => {
    (globalThis as unknown as { WebSocket: unknown }).WebSocket = originalWebSocket;
  });

  const configure = (): WebSocketService => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        WebSocketService,
        { provide: AuthService, useValue: authMock },
      ],
    });
    const service = TestBed.inject(WebSocketService);
    TestBed.tick();
    return service;
  };

  it('does not connect when no auth token is present', () => {
    const service = configure();
    service.connect();
    expect(service.state()).toBe('disconnected');
    expect(FakeWebSocket.instances.length).toBe(0);
  });

  it('opens a WebSocket and emits connected when a token is present', () => {
    authMock.getToken.mockReturnValue('jwt-token');
    const service = configure();
    service.connect();
    expect(FakeWebSocket.instances.length).toBe(1);
    const socket = FakeWebSocket.instances[0];
    expect(socket.url).toContain('/app/framematch-reverb-key');
    socket.readyState = 1;
    socket.dispatch('open', {});
    expect(service.state()).toBe('connected');
  });

  it('keeps pending subscriptions when the socket closes', () => {
    authMock.getToken.mockReturnValue('jwt-token');
    const service = configure();
    service.connect();
    const first = FakeWebSocket.instances[0];
    first.readyState = 1;
    first.dispatch('open', {});

    service.subscribe('private-conversation.7', 'message.sent', () => undefined);
    expect(first.sent.some((s) => s.includes('private-conversation.7'))).toBe(true);

    // Simulate a close. The service should still keep the subscription in
    // `pendingSubs` so that the next connect() resends it.
    first.dispatch('close', {});
    // eslint-disable-next-line no-console
    console.log('after close', { state: service.state(), pending: service.pendingSubsCount() });
    expect(service.pendingSubsCount()).toBe(1);
  });

  it('dispatches incoming messages to subscribed callbacks', () => {
    authMock.getToken.mockReturnValue('jwt-token');
    const service = configure();
    service.connect();
    const socket = FakeWebSocket.instances[0];
    socket.readyState = 1;
    socket.dispatch('open', {});

    const cb = jest.fn();
    service.subscribe('private-conversation.7', 'message.sent', cb);
    socket.dispatch('message', {
      data: JSON.stringify({
        event: 'message.sent',
        channel: 'private-conversation.7',
        data: { id: 99, body: 'hola' },
      }),
    });

    expect(cb).toHaveBeenCalledWith({ id: 99, body: 'hola' });
  });

  it('marks the state as reconnecting after a close when not explicit', () => {
    authMock.getToken.mockReturnValue('jwt-token');
    const service = configure();
    service.connect();
    const socket = FakeWebSocket.instances[0];
    socket.readyState = 1;
    socket.dispatch('open', {});
    socket.dispatch('close', {});
    expect(service.state()).toBe('reconnecting');
  });

  it('marks the state as disconnected when explicitly disconnected', () => {
    authMock.getToken.mockReturnValue('jwt-token');
    const service = configure();
    service.connect();
    const socket = FakeWebSocket.instances[0];
    socket.readyState = 1;
    socket.dispatch('open', {});
    service.disconnect();
    expect(service.state()).toBe('disconnected');
  });
});
