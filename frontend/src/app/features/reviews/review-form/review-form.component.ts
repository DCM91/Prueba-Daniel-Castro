import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { of } from 'rxjs';

import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ReviewsService } from '../../../core/services/reviews.service';
import { Review } from '../../../core/types/auth.types';
import { RatingStarsComponent } from '../rating-stars/rating-stars.component';

type ReviewForm = FormGroup<{
  rating: FormControl<number>;
  comment: FormControl<string>;
}>;

const MAX_COMMENT = 1000;

@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, RatingStarsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './review-form.component.html',
  styleUrl: './review-form.component.css',
})
export class ReviewFormComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly reviews = inject(ReviewsService);

  readonly briefId = input.required<number>();
  readonly existing = input<Review | null>(null);
  readonly submitted = output<Review>();

  readonly saving = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly currentUser = signal<{ id: number; name: string } | null>(null);
  readonly maxComment = MAX_COMMENT;

  readonly form: ReviewForm = this.fb.group({
    rating: this.fb.control(0, [Validators.required, Validators.min(1), Validators.max(5)]),
    comment: this.fb.control('', [Validators.maxLength(MAX_COMMENT)]),
  });

  readonly starValue = signal<number>(0);

  readonly previewCharCount = computed<number>(() => this.form.controls.comment.value.length);

  ngOnInit(): void {
    const existing = this.existing();
    if (existing) {
      this.form.patchValue({ rating: existing.rating, comment: existing.comment ?? '' });
      this.starValue.set(existing.rating);
    }
  }

  onStarChange(value: number): void {
    this.starValue.set(value);
    this.form.controls.rating.setValue(value);
    this.form.controls.rating.markAsTouched();
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.errorMessage.set(null);

    const raw = this.form.getRawValue();
    const obs$ = this.existing() !== null
      ? of<Review | null>(null)
      : this.reviews.create(this.briefId(), { rating: raw.rating, comment: raw.comment || null });

    obs$.subscribe({
      next: (created: Review | null) => {
        this.saving.set(false);
        if (created) this.submitted.emit(created);
      },
      error: () => {
        this.errorMessage.set('reviews.error_save');
        this.saving.set(false);
      },
    });
  }
}
