import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnChanges,
  OnInit,
  SimpleChanges,
  inject,
  input,
  signal,
} from '@angular/core';

import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ReviewsService } from '../../../core/services/reviews.service';
import { Review } from '../../../core/types/auth.types';
import { RatingStarsComponent } from '../rating-stars/rating-stars.component';

@Component({
  selector: 'app-review-list',
  standalone: true,
  imports: [TranslatePipe, DatePipe, RatingStarsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './review-list.component.html',
  styleUrl: './review-list.component.css',
})
export class ReviewListComponent implements OnInit, OnChanges {
  private readonly reviews = inject(ReviewsService);

  readonly userId = input<number | null>(null);
  readonly briefId = input<number | null>(null);
  readonly limit = input<number>(20);
  readonly emptyKey = input<string>('reviews.empty_for_user');
  readonly sectionTitle = input<string>('reviews.section_title');
  readonly showBriefContext = input<boolean>(false);
  readonly refreshKey = input<number>(0);

  readonly loading = signal<boolean>(true);
  readonly items = signal<Review[]>([]);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.refresh();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['refreshKey'] && !changes['refreshKey'].firstChange) {
      this.refresh();
    }
  }

  refresh(): void {
    const userId = this.userId();
    const briefId = this.briefId();
    if (userId === null && briefId === null) {
      this.errorMessage.set('reviews.error_load');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    const obs = briefId !== null
      ? this.reviews.listForBrief(briefId)
      : this.reviews.listForUser(userId!, this.limit());

    obs.subscribe({
      next: (list) => {
        this.items.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('reviews.error_load');
        this.loading.set(false);
      },
    });
  }

  initials(name?: string | null): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
}
