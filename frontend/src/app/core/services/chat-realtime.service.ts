import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';

import { AuthService } from './auth.service';
import { Notification } from '../types/auth.types';
import { WebSocketService } from './websocket.service';

export interface MessageSentEvent {
  message: {
    id: number;
    conversation_id: number;
    body: string;
    sender_id: number;
    read_at: string | null;
    created_at: string;
    sender?: { id: number; name: string };
  };
}

export interface ConversationUpdatedEvent {
  conversation_id: number;
  last_message_at: string | null;
}

export interface UnreadCountChangedEvent {
  user_id: number;
  total: number;
}

export type NotificationReceivedEvent = Notification;

/**
 * High-level wrapper around the raw WebSocketService. Owns the lifecycle of
 * "the user is in chat, keep their private channels subscribed" and exposes
 * domain events the UI components subscribe to via signals.
 *
 * Connect on login, disconnect on logout. Subscriptions are kept across
 * reconnects automatically.
 */
@Injectable({ providedIn: 'root' })
export class ChatRealtimeService {
  private readonly ws = inject(WebSocketService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly connected = this.ws.isConnected;

  /** Latest unread count pushed by the server. Mirrors the topbar badge. */
  readonly unreadTotal = signal<number>(0);

  private userChannelUnsubs: (() => void)[] = [];
  private readonly conversationUnsubs = new Map<number, () => void>();
  private readonly messageListeners = new Map<number, Set<(msg: MessageSentEvent['message']) => void>>();
  private readonly conversationListeners = new Map<number, Set<(evt: ConversationUpdatedEvent) => void>>();
  private readonly unreadListeners = new Set<(evt: UnreadCountChangedEvent) => void>();
  private readonly notificationListeners = new Set<(n: NotificationReceivedEvent) => void>();

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      if (user) {
        this.connect();
      } else {
        this.disconnect();
      }
    });

    this.destroyRef.onDestroy(() => this.disconnect());
  }

  /**
   * Open the WebSocket and subscribe to the user's own private channel
   * (for unread count updates and incoming notifications). Idempotent.
   */
  connect(): void {
    this.ws.connect();
    const user = this.auth.currentUser();
    if (!user) return;
    if (this.userChannelUnsubs.length > 0) return;

    const channel = `private-user.${user.id}`;

    this.userChannelUnsubs.push(
      this.ws.subscribe<UnreadCountChangedEvent>(channel, 'unread.changed', (evt) => {
        this.unreadTotal.set(evt.total);
        for (const cb of this.unreadListeners) {
          cb(evt);
        }
      }),
    );

    this.userChannelUnsubs.push(
      this.ws.subscribe<NotificationReceivedEvent>(channel, 'notification.received', (evt) => {
        for (const cb of this.notificationListeners) {
          cb(evt);
        }
      }),
    );
  }

  disconnect(): void {
    for (const unsub of this.userChannelUnsubs) {
      unsub();
    }
    this.userChannelUnsubs = [];
    for (const unsub of this.conversationUnsubs.values()) {
      unsub();
    }
    this.conversationUnsubs.clear();
    this.ws.disconnect();
  }

  /**
   * Subscribe to a conversation. Returns an unsubscribe function. Multiple
   * listeners on the same conversation share one WS subscription.
   */
  subscribeToConversation(
    conversationId: number,
    onMessage: (msg: MessageSentEvent['message']) => void,
    onUpdate?: (evt: ConversationUpdatedEvent) => void,
  ): () => void {
    let messageSet = this.messageListeners.get(conversationId);
    if (!messageSet) {
      messageSet = new Set();
      this.messageListeners.set(conversationId, messageSet);
    }
    messageSet.add(onMessage);

    if (onUpdate) {
      let updateSet = this.conversationListeners.get(conversationId);
      if (!updateSet) {
        updateSet = new Set();
        this.conversationListeners.set(conversationId, updateSet);
      }
      updateSet.add(onUpdate);
    }

    this.ensureConversationSubscription(conversationId);

    return () => {
      messageSet?.delete(onMessage);
      if (onUpdate) {
        this.conversationListeners.get(conversationId)?.delete(onUpdate);
      }
      if ((messageSet?.size ?? 0) === 0 && (this.conversationListeners.get(conversationId)?.size ?? 0) === 0) {
        const unsub = this.conversationUnsubs.get(conversationId);
        unsub?.();
        this.conversationUnsubs.delete(conversationId);
        this.messageListeners.delete(conversationId);
        this.conversationListeners.delete(conversationId);
      }
    };
  }

  onUnreadChange(callback: (evt: UnreadCountChangedEvent) => void): () => void {
    this.unreadListeners.add(callback);
    return () => this.unreadListeners.delete(callback);
  }

  /**
   * Subscribe to incoming in-app notifications pushed by the server.
   * Returns an unsubscribe function.
   */
  onNotification(callback: (n: NotificationReceivedEvent) => void): () => void {
    this.notificationListeners.add(callback);
    return () => this.notificationListeners.delete(callback);
  }

  private ensureConversationSubscription(conversationId: number): void {
    if (this.conversationUnsubs.has(conversationId)) return;

    const messageUnsub = this.ws.subscribe<MessageSentEvent>(
      `private-conversation.${conversationId}`,
      'message.sent',
      (evt) => {
        const set = this.messageListeners.get(conversationId);
        if (set) for (const cb of set) cb(evt.message);
      },
    );

    let updateUnsub: (() => void) | null = null;
    if (this.conversationListeners.get(conversationId)?.size ?? 0 > 0) {
      updateUnsub = this.ws.subscribe<ConversationUpdatedEvent>(
        `private-conversation.${conversationId}`,
        'conversation.updated',
        (evt) => {
          const set = this.conversationListeners.get(conversationId);
          if (set) for (const cb of set) cb(evt);
        },
      );
    }

    this.conversationUnsubs.set(conversationId, () => {
      messageUnsub();
      updateUnsub?.();
    });
  }
}
