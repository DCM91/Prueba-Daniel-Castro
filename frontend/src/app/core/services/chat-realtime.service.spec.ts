import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';
import { ChatRealtimeService } from './chat-realtime.service';
import { WebSocketService } from './websocket.service';

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  sent: string[] = [];
  listeners: Record<string, Array<(ev: unknown) => void>> = {};
  readyState = 0;
  constructor(_url: string) {
    FakeWebSocket.instances.push(this);
  }
  addEventListener(name: string, fn: (ev: unknown) => void): void {
    (this.listeners[name] ??= []).push(fn);
  }
  send(data: string): void { this.sent.push(data); }
  close(): void { this.readyState = 3; this.dispatch('close', {}); }
  dispatch(name: string, payload: unknown): void {
    for (const fn of this.listeners[name] ?? []) fn(payload);
  }
}

const originalWS = (globalThis as { WebSocket?: unknown }).WebSocket;
(globalThis as unknown as { WebSocket: unknown }).WebSocket = FakeWebSocket as unknown as typeof WebSocket;

describe('ChatRealtimeService', () => {
  let authMock: { getToken: jest.Mock; currentUser: () => unknown };

  beforeEach(() => {
    FakeWebSocket.instances = [];
    authMock = { getToken: jest.fn().mockReturnValue('jwt-token'), currentUser: () => ({ id: 1, role: 'client' }) };
  });

  afterAll(() => {
    (globalThis as unknown as { WebSocket: unknown }).WebSocket = originalWS;
  });

  const configure = (): ChatRealtimeService => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        WebSocketService,
        ChatRealtimeService,
        { provide: AuthService, useValue: authMock },
      ],
    });
    const service = TestBed.inject(ChatRealtimeService);
    // Force the effect that calls connect() on construction to run synchronously.
    TestBed.tick();
    return service;
  };

  const openSocket = (): FakeWebSocket => {
    const socket = FakeWebSocket.instances[0];
    socket.readyState = 1;
    socket.dispatch('open', {});
    return socket;
  };

  it('updates unreadTotal when the server pushes an unread.changed event', () => {
    const service = configure();
    const socket = openSocket();
    socket.dispatch('message', {
      data: JSON.stringify({
        event: 'unread.changed',
        channel: 'private-user.1',
        data: { user_id: 1, total: 5 },
      }),
    });
    expect(service.unreadTotal()).toBe(5);
  });

  it('forwards onUnreadChange callbacks', () => {
    const service = configure();
    const socket = openSocket();
    const cb = jest.fn();
    service.onUnreadChange(cb);
    socket.dispatch('message', {
      data: JSON.stringify({
        event: 'unread.changed',
        channel: 'private-user.1',
        data: { user_id: 1, total: 3 },
      }),
    });
    expect(cb).toHaveBeenCalledWith({ user_id: 1, total: 3 });
  });

  it('dispatches incoming messages to conversation subscribers', () => {
    const service = configure();
    const socket = openSocket();
    const cb = jest.fn();
    service.subscribeToConversation(7, cb);
    socket.dispatch('message', {
      data: JSON.stringify({
        event: 'message.sent',
        channel: 'private-conversation.7',
        data: { message: { id: 1, body: 'hola' } },
      }),
    });
    expect(cb).toHaveBeenCalledWith({ id: 1, body: 'hola' });
  });

  it('unsubscribe removes the listener', () => {
    const service = configure();
    const socket = openSocket();
    const cb = jest.fn();
    const unsub = service.subscribeToConversation(7, cb);
    unsub();
    socket.dispatch('message', {
      data: JSON.stringify({
        event: 'message.sent',
        channel: 'private-conversation.7',
        data: { message: { id: 2, body: 'otro' } },
      }),
    });
    expect(cb).not.toHaveBeenCalled();
  });
});
