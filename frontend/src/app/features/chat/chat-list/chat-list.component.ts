import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Subscription, interval } from 'rxjs';

import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { ChatRealtimeService } from '../../../core/services/chat-realtime.service';
import { ChatService } from '../../../core/services/chat.service';
import { Conversation } from '../../../core/types/auth.types';

const POLL_INTERVAL_MS = 30_000;

@Component({
  selector: 'app-chat-list',
  standalone: true,
  imports: [TranslatePipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chat-list.component.html',
  styleUrl: './chat-list.component.css',
})
export class ChatListComponent implements OnInit, OnDestroy {
  private readonly chat = inject(ChatService);
  private readonly auth = inject(AuthService);
  private readonly realtime = inject(ChatRealtimeService);

  readonly briefId = input<number | null>(null);
  readonly open = output<Conversation>();

  readonly currentUser = this.auth.currentUser;
  readonly conversations = signal<Conversation[]>([]);
  readonly loading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);

  private pollSub: Subscription | null = null;
  private unreadUnsub: (() => void) | null = null;

  ngOnInit(): void {
    this.refresh();
    // Slow polling as fallback for clients where WebSockets are blocked
    // (corporate proxies, devtools open, etc). Fast updates come from WS.
    this.pollSub = interval(POLL_INTERVAL_MS).subscribe(() => this.refresh(true));
    // Refresh whenever the server pushes an unread count change.
    this.unreadUnsub = this.realtime.onUnreadChange(() => this.refresh(true));
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    this.unreadUnsub?.();
  }

  refresh(silent = false): void {
    if (!silent) this.loading.set(true);
    this.errorMessage.set(null);
    this.chat.listConversations().subscribe({
      next: (list) => {
        this.conversations.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('chat.error_load_list');
        this.loading.set(false);
      },
    });
  }

  ensureAndOpen(briefId: number): void {
    this.loading.set(true);
    this.chat.ensureForBrief(briefId).subscribe({
      next: (conversation) => {
        this.open.emit(conversation);
        this.refresh(true);
      },
      error: () => {
        this.errorMessage.set('chat.error_load_list');
        this.loading.set(false);
      },
    });
  }

  selectConversation(conversation: Conversation): void {
    this.open.emit(conversation);
  }

  counterpart(conversation: Conversation): { id: number; name: string } {
    const me = this.currentUser();
    if (me?.id === conversation.client_id) {
      return { id: conversation.freelancer_id, name: conversation.freelancer?.name ?? '' };
    }
    return { id: conversation.client_id, name: conversation.client?.name ?? '' };
  }

  previewBody(conversation: Conversation): string {
    return conversation.latest_message?.body ?? '';
  }
}
