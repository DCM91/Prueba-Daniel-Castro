import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { ReviewsService } from '../../../core/services/reviews.service';
import { Review } from '../../../core/types/auth.types';
import { ReviewFormComponent } from '../review-form/review-form.component';
import { ReviewListComponent } from '../review-list/review-list.component';

@Component({
  selector: 'app-reviews-section',
  standalone: true,
  imports: [TranslatePipe, ReviewFormComponent, ReviewListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reviews-section.component.html',
  styleUrl: './reviews-section.component.css',
})
export class ReviewsSectionComponent implements OnInit {
  private readonly reviewsService = inject(ReviewsService);
  private readonly auth = inject(AuthService);

  readonly briefId = input.required<number>();
  readonly briefStatus = input.required<string>();
  readonly briefClientId = input.required<number>();
  readonly briefFreelancerId = input<number | null>(null);
  readonly briefTitle = input<string>('');

  readonly currentUser = this.auth.currentUser;
  readonly existingReview = signal<Review | null>(null);
  readonly refreshKey = signal<number>(0);
  readonly completing = signal<boolean>(false);
  readonly completeError = signal<string | null>(null);
  readonly completeDone = signal<boolean>(false);

  readonly isOwner = computed<boolean>(() => this.currentUser()?.id === this.briefClientId());
  readonly isFreelancer = computed<boolean>(
    () => this.currentUser()?.id !== null && this.currentUser()?.id === this.briefFreelancerId(),
  );
  readonly isParticipant = computed<boolean>(() => this.isOwner() || this.isFreelancer());
  readonly isCompleted = computed<boolean>(() => this.briefStatus() === 'completed');
  readonly canComplete = computed<boolean>(
    () => this.isOwner() && this.briefStatus() === 'assigned',
  );

  ngOnInit(): void {
    if (this.isParticipant()) {
      this.reviewsService.listForBrief(this.briefId()).subscribe({
        next: (list) => {
          const me = this.currentUser()?.id;
          const mine = list.find((r) => r.reviewer_id === me) ?? null;
          this.existingReview.set(mine);
        },
      });
    }
  }

  markAsCompleted(): void {
    if (this.completing()) return;
    this.completing.set(true);
    this.completeError.set(null);
    this.reviewsService.completeBrief(this.briefId()).subscribe({
      next: () => {
        this.completing.set(false);
        this.completeDone.set(true);
        this.refreshKey.update((n) => n + 1);
      },
      error: () => {
        this.completing.set(false);
        this.completeError.set('reviews.complete_brief_error');
      },
    });
  }

  onReviewSubmitted(): void {
    this.refreshKey.update((n) => n + 1);
    this.reviewsService.listForBrief(this.briefId()).subscribe({
      next: (list) => {
        const me = this.currentUser()?.id;
        const mine = list.find((r) => r.reviewer_id === me) ?? null;
        this.existingReview.set(mine);
      },
    });
  }
}
