import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription, interval } from 'rxjs';

import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { ChatRealtimeService } from '../../../core/services/chat-realtime.service';
import { ChatService } from '../../../core/services/chat.service';
import { ChatMessage, Conversation } from '../../../core/types/auth.types';

const POLL_INTERVAL_MS = 30_000;
const MAX_BODY = 2000;

type SendForm = FormGroup<{ body: FormControl<string> }>;

@Component({
  selector: 'app-chat-thread',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chat-thread.component.html',
  styleUrl: './chat-thread.component.css',
})
export class ChatThreadComponent implements OnInit, OnDestroy {
  private readonly chat = inject(ChatService);
  private readonly auth = inject(AuthService);
  private readonly realtime = inject(ChatRealtimeService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly conversation = input.required<Conversation>();
  readonly back = output<void>();

  readonly currentUser = this.auth.currentUser;
  readonly messages = signal<ChatMessage[]>([]);
  readonly loading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly sending = signal<boolean>(false);
  readonly lastSyncedAt = signal<string | null>(null);
  readonly maxLength = MAX_BODY;

  @ViewChild('scrollContainer') private scrollContainer?: ElementRef<HTMLElement>;

  readonly counterpart = computed<{ id: number; name: string } | null>(() => {
    const conv = this.conversation();
    const me = this.currentUser();
    if (!conv || !me) return null;
    if (me.id === conv.client_id) {
      return { id: conv.freelancer_id, name: conv.freelancer?.name ?? '' };
    }
    return { id: conv.client_id, name: conv.client?.name ?? '' };
  });

  readonly form: SendForm = this.fb.group({
    body: this.fb.control('', [Validators.required, Validators.maxLength(MAX_BODY)]),
  });

  private pollSub: Subscription | null = null;
  private conversationUnsub: (() => void) | null = null;

  constructor() {
    effect(() => {
      const conv = this.conversation();
      if (conv) {
        this.loadHistory(conv.id);
        this.markRead(conv.id);
      }
    });
  }

  ngOnInit(): void {
    // Slow polling as fallback (proxies that block WS, devtools open, etc).
    this.pollSub = interval(POLL_INTERVAL_MS).subscribe(() => {
      const conv = this.conversation();
      if (conv) this.pollNew(conv.id);
    });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    this.conversationUnsub?.();
  }

  loadHistory(conversationId: number): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.chat.listMessages(conversationId, { limit: 50 }).subscribe({
      next: (resp) => {
        this.messages.set(resp.data);
        this.lastSyncedAt.set(resp.latest_at);
        this.loading.set(false);
        this.scrollToBottom();
        this.subscribeToConversation(conversationId);
      },
      error: () => {
        this.errorMessage.set('chat.error_load_messages');
        this.loading.set(false);
      },
    });
  }

  private subscribeToConversation(conversationId: number): void {
    this.conversationUnsub?.();
    this.conversationUnsub = this.realtime.subscribeToConversation(
      conversationId,
      (msg) => {
        // Skip if we already have it (e.g. our own send).
        if (this.messages().some((m) => m.id === msg.id)) return;
        this.messages.update((list) => [...list, this.normalizeMessage(msg)]);
        this.lastSyncedAt.set(msg.created_at);
        this.scrollToBottom();
      },
      () => {
        this.pollNew(conversationId);
      },
    );
  }

  private normalizeMessage(msg: { id: number; conversation_id: number; body: string; sender_id: number; read_at: string | null; created_at: string; sender?: { id: number; name: string } }): ChatMessage {
    return {
      id: msg.id,
      conversation_id: msg.conversation_id,
      body: msg.body,
      sender_id: msg.sender_id,
      read_at: msg.read_at,
      created_at: msg.created_at,
      sender: msg.sender
        ? { id: msg.sender.id, name: msg.sender.name, avatar_url: null }
        : undefined,
    };
  }

  pollNew(conversationId: number): void {
    const since = this.lastSyncedAt();
    if (!since) return;
    this.chat.listMessages(conversationId, { since, limit: 100 }).subscribe({
      next: (resp) => {
        if (resp.data.length === 0) return;
        const existing = new Set(this.messages().map((m) => m.id));
        const incoming = resp.data.filter((m) => !existing.has(m.id));
        if (incoming.length === 0) return;
        this.messages.update((list) => [...list, ...incoming]);
        this.lastSyncedAt.set(resp.latest_at ?? since);
        this.scrollToBottom();
        this.markRead(conversationId);
      },
    });
  }

  send(): void {
    if (this.form.invalid || this.sending()) return;
    const conv = this.conversation();
    if (!conv) return;
    const body = this.form.controls.body.value.trim();
    if (!body) return;

    this.sending.set(true);
    this.errorMessage.set(null);
    this.chat.sendMessage(conv.id, body).subscribe({
      next: (msg) => {
        this.messages.update((list) => [...list, msg]);
        this.lastSyncedAt.set(msg.created_at ?? this.lastSyncedAt());
        this.form.reset({ body: '' });
        this.sending.set(false);
        this.scrollToBottom();
      },
      error: () => {
        this.errorMessage.set('chat.error_send');
        this.sending.set(false);
      },
    });
  }

  markRead(conversationId: number): void {
    this.chat.markRead(conversationId).subscribe({ error: () => undefined });
  }

  isOwn(message: ChatMessage): boolean {
    return message.sender_id === this.currentUser()?.id;
  }

  trackById(_: number, item: ChatMessage): number {
    return item.id;
  }

  private scrollToBottom(): void {
    queueMicrotask(() => {
      const el = this.scrollContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
