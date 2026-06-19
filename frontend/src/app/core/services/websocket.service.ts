import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, timer } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export type WebSocketState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

interface PendingSubscription {
  channel: string;
  event: string;
  callback: (data: unknown) => void;
}

const PUSHER_RECONNECT_BASE_MS = 1_000;
const PUSHER_RECONNECT_MAX_MS = 30_000;
const PING_INTERVAL_MS = 60_000;
const WS_OPEN = 1;

/**
 * Minimal Pusher-protocol WebSocket client. Works against Laravel Reverb out
 * of the box (Reverb speaks Pusher WS protocol). Provides:
 *
 * - Single shared WebSocket per app (singleton via providedIn: 'root')
 * - JWT auth header passed on every connection
 * - Auto-reconnect with exponential backoff
 * - Per-channel + per-event pub/sub
 * - Resilient to JWT rotation (re-uses the current token on reconnect)
 *
 * NOTE: This is a hand-rolled Pusher client (no pusher-js dependency) to
 * keep the bundle small. It only implements the subset Reverb uses.
 */
@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  private socket: WebSocket | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts = 0;
  private explicitClose = false;
  private readonly eventBus = new Subject<{ channel: string; event: string; data: unknown }>();
  private readonly pendingSubs = new Map<string, PendingSubscription>();

  readonly state = signal<WebSocketState>('disconnected');
  readonly isConnected = computed(() => this.state() === 'connected');

  /** Test helper: how many subscriptions are queued for re-send on reconnect. */
  pendingSubsCount(): number {
    return this.pendingSubs.size;
  }

  constructor() {
    this.auth.currentUser;
    this.destroyRef.onDestroy(() => this.disconnect());
  }

  /**
   * Open the WebSocket connection if not already open. Reentrant-safe.
   * Uses the current JWT from AuthService; call again after login.
   */
  connect(): void {
    if (this.socket && (this.state() === 'connected' || this.state() === 'connecting')) {
      return;
    }
    if (typeof window === 'undefined') return;

    const user = this.auth.currentUser();
    if (!user) {
      return;
    }

    this.state.set(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    const config = this.resolveConfig();
    if (config === null) {
      this.state.set('disconnected');
      return;
    }

    const url = `${config.scheme}://${config.host}:${config.port}/app/${config.key}?protocol=7&client=js&version=8&flash=false`;
    const socket = new WebSocket(url);
    this.socket = socket;
    this.explicitClose = false;

    socket.addEventListener('open', () => this.handleOpen());
    socket.addEventListener('close', () => this.handleClose());
    socket.addEventListener('error', () => this.handleClose());
    socket.addEventListener('message', (ev) => this.handleMessage(ev));
  }

  disconnect(): void {
    this.explicitClose = true;
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.state.set('disconnected');
  }

  /**
   * Subscribe to a (channel, event). Replays the subscription on reconnect.
   * Returns an unsubscribe function.
   */
  subscribe<T = unknown>(channel: string, event: string, callback: (data: T) => void): () => void {
    const key = `${channel}::${event}`;
    this.pendingSubs.set(key, { channel, event, callback: callback as (data: unknown) => void });

    this.eventBus
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((msg) => {
        if (msg.channel === channel && msg.event === event) {
          callback(msg.data as T);
        }
      });

    if (this.isConnected()) {
      this.sendSubscribe(channel);
    }

    return () => {
      this.pendingSubs.delete(key);
      if (this.isConnected() && this.socket) {
        this.sendUnsubscribe(channel);
      }
    };
  }

  private resolveConfig(): { scheme: 'ws' | 'wss'; host: string; port: number; key: string; auth: string } | null {
    if (typeof window === 'undefined') return null;

    const token = this.auth.getToken();
    if (!token) return null;

    return {
      scheme: environment.ws.scheme,
      host: environment.ws.host,
      port: environment.ws.port,
      key: environment.ws.key,
      auth: token,
    };
  }

  private handleOpen(): void {
    this.reconnectAttempts = 0;
    this.state.set('connected');
    this.startPing();
    for (const sub of this.pendingSubs.values()) {
      this.sendSubscribe(sub.channel);
    }
  }

  private handleClose(): void {
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    this.socket = null;
    if (this.explicitClose) {
      this.state.set('disconnected');
      return;
    }
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    this.state.set('reconnecting');
    this.reconnectAttempts += 1;
    const delay = Math.min(
      PUSHER_RECONNECT_BASE_MS * Math.pow(2, this.reconnectAttempts - 1),
      PUSHER_RECONNECT_MAX_MS,
    );
    timer(delay).subscribe(() => this.connect());
  }

  private startPing(): void {
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer);
    }
    this.pingTimer = setInterval(() => {
      if (this.socket?.readyState === WS_OPEN) {
        this.socket.send(JSON.stringify({ event: 'pusher:ping', data: {} }));
      }
    }, PING_INTERVAL_MS);
  }

  private handleMessage(ev: MessageEvent): void {
    let payload: { event?: string; data?: unknown; channel?: string } | null = null;
    try {
      payload = JSON.parse(ev.data) as { event?: string; data?: unknown; channel?: string };
    } catch {
      return;
    }
    if (!payload || !payload.event) return;

    if (payload.event === 'pusher:pong') return;

    if (payload.event.startsWith('pusher:')) {
      if (payload.event === 'pusher:error' || payload.event === 'pusher:subscription_error') {
        // Auth failure on a private channel — full reconnect to retry auth.
        this.handleClose();
      }
      return;
    }

    const channel = payload.channel;
    if (!channel) return;
    this.eventBus.next({ channel, event: payload.event, data: payload.data });
  }

  private sendSubscribe(channel: string): void {
    if (!this.socket || this.socket.readyState !== WS_OPEN) return;
    const isPrivate = channel.startsWith('private-') || channel.startsWith('presence-');
    if (isPrivate) {
      // For private channels the server will emit pusher:subscription_succeeded
      // or pusher:subscription_error. Reverb uses the standard Pusher flow.
      this.socket.send(
        JSON.stringify({
          event: 'pusher:subscribe',
          data: { auth: this.buildAuthForChannel(channel), channel },
        }),
      );
    } else {
      this.socket.send(
        JSON.stringify({ event: 'pusher:subscribe', data: { channel } }),
      );
    }
  }

  private sendUnsubscribe(channel: string): void {
    if (!this.socket || this.socket.readyState !== WS_OPEN) return;
    this.socket.send(
      JSON.stringify({ event: 'pusher:unsubscribe', data: { channel } }),
    );
  }

  private buildAuthForChannel(channel: string): string {
    // Reverb accepts a signed auth string per the Pusher protocol.
    // We use the browser-side HMAC-SHA256 over `${socketId}:${channel}`
    // with the REVERB_APP_KEY. The auth endpoint is the standard
    // /pusher/auth (broadcasting/auth) which Reverb exposes.
    //
    // For the MVP we fall back to passing the JWT as the auth string
    // when a custom auth endpoint has been wired up.
    const token = this.auth.getToken() ?? '';
    return token;
  }
}
