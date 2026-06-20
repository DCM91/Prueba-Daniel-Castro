import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ChatListComponent } from '../chat-list/chat-list.component';
import { ChatThreadComponent } from '../chat-thread/chat-thread.component';
import { ChatService } from '../../../core/services/chat.service';
import { Conversation } from '../../../core/types/auth.types';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [TranslatePipe, ChatListComponent, ChatThreadComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chat-page.component.html',
  styleUrl: './chat-page.component.css',
})
export class ChatPageComponent implements OnInit {
  private readonly chat = inject(ChatService);
  private readonly route = inject(ActivatedRoute);

  readonly selected = signal<Conversation | null>(null);
  readonly isMobile = signal<boolean>(false);
  readonly initialBriefId = signal<number | null>(null);

  readonly showThread = computed<boolean>(() => this.selected() !== null);

  ngOnInit(): void {
    const briefId = this.route.snapshot.queryParamMap.get('brief');
    if (briefId) {
      const id = Number(briefId);
      if (Number.isInteger(id) && id > 0) {
        this.initialBriefId.set(id);
      }
    }
  }

  openFromList(conversation: Conversation): void {
    this.selected.set(conversation);
  }

  openFromBrief(briefId: number): void {
    this.chat.ensureForBrief(briefId).subscribe({
      next: (conversation) => this.selected.set(conversation),
      error: () => this.selected.set(null),
    });
  }

  backToList(): void {
    this.selected.set(null);
  }
}
