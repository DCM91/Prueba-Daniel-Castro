import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { ChatRealtimeService } from '../../services/chat-realtime.service';
import { NotificationsService } from '../../services/notifications.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { Notification, NotificationKind } from '../../types/auth.types';

const BELL_LIMIT = 10;

@Component({
  selector: 'app-notifications-bell',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notifications-bell.component.html',
  styleUrl: './notifications-bell.component.css',
})
export class NotificationsBellComponent implements OnInit, OnDestroy {
  private readonly notifications = inject(NotificationsService);
  private readonly realtime = inject(ChatRealtimeService);
  private readonly router = inject(Router);

  readonly items = signal<Notification[]>([]);
  readonly unreadCount = signal<number>(0);
  readonly loading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly open = signal<boolean>(false);
  readonly shaking = signal<boolean>(false);

  private readonly dropdownRef = viewChild<ElementRef<HTMLElement>>('dropdown');
  private previousFocus: HTMLElement | null = null;
  private realtimeUnsub: (() => void) | null = null;
  private pollSub: Subscription | null = null;
  private shakeTimer: ReturnType<typeof setTimeout> | null = null;

  readonly hasUnread = computed<boolean>(() => this.unreadCount() > 0);
  readonly displayUnread = computed<string>(() => {
    const n = this.unreadCount();
    return n > 99 ? '99+' : String(n);
  });

  constructor() {
    effect(() => {
      const isOpen = this.open();
      if (isOpen) {
        this.previousFocus = (typeof document !== 'undefined' ? document.activeElement : null) as HTMLElement | null;
        queueMicrotask(() => this.focusFirst());
      } else {
        this.previousFocus?.focus();
      }
    });
  }

  ngOnInit(): void {
    this.refresh();
    this.realtimeUnsub = this.realtime.onNotification((n) => {
      this.items.update((list) => [n, ...list].slice(0, BELL_LIMIT));
      this.unreadCount.update((c) => c + 1);
      this.triggerShake();
    });
  }

  ngOnDestroy(): void {
    this.realtimeUnsub?.();
    this.pollSub?.unsubscribe();
    if (this.shakeTimer !== null) clearTimeout(this.shakeTimer);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.open()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeDropdown();
    }
  }

  toggle(): void {
    if (this.open()) {
      this.closeDropdown();
    } else {
      this.open.set(true);
      this.refresh();
    }
  }

  closeDropdown(): void {
    this.open.set(false);
  }

  refresh(): void {
    if (!this.loading() && this.items().length === 0) {
      this.loading.set(true);
    }
    this.errorMessage.set(null);
    this.notifications.list({ perPage: BELL_LIMIT }).subscribe({
      next: (res) => {
        this.items.set(res.data);
        this.unreadCount.set(res.data.filter((n) => n.read_at === null).length);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('notifications.error_load');
        this.loading.set(false);
      },
    });
  }

  refreshUnreadOnly(): void {
    this.notifications.unreadCount().subscribe({
      next: (n) => this.unreadCount.set(n),
      error: () => undefined,
    });
  }

  selectItem(n: Notification): void {
    if (n.read_at === null) {
      this.notifications.markRead(n.id).subscribe({
        next: (updated) => this.replaceItem(updated),
        error: () => undefined,
      });
      this.unreadCount.update((c) => Math.max(0, c - 1));
    }
    if (n.link) {
      this.router.navigateByUrl(n.link);
    }
    this.closeDropdown();
  }

  markAllRead(): void {
    this.notifications.markAllRead().subscribe({
      next: (updated) => {
        if (updated === 0) return;
        this.items.update((list) =>
          list.map((n) => (n.read_at === null ? { ...n, read_at: new Date().toISOString() } : n)),
        );
        this.unreadCount.set(0);
      },
      error: () => undefined,
    });
  }

  iconFor(kind: NotificationKind | null): string {
    switch (kind) {
      case 'proposal_received':  return 'inbox';
      case 'proposal_accepted':  return 'check-circle';
      case 'proposal_rejected':  return 'x-circle';
      case 'brief_assigned':     return 'briefcase';
      case 'brief_completed':    return 'flag';
      case 'review_received':    return 'star';
      default:                   return 'bell';
    }
  }

  trackById(_: number, n: Notification): string {
    return n.id;
  }

  private replaceItem(updated: Notification): void {
    this.items.update((list) => list.map((n) => (n.id === updated.id ? updated : n)));
  }

  private focusFirst(): void {
    const dropdown = this.dropdownRef()?.nativeElement;
    if (!dropdown) return;
    const focusable = dropdown.querySelector<HTMLElement>(
      'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();
  }

  private triggerShake(): void {
    this.shaking.set(true);
    if (this.shakeTimer !== null) clearTimeout(this.shakeTimer);
    this.shakeTimer = setTimeout(() => this.shaking.set(false), 600);
  }
}
