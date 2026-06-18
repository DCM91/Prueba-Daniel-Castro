import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-rating-stars',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="rating-stars"
      [attr.data-size]="size()"
      [attr.aria-label]="'rating.aria_label' | t : { n: value() }"
      [attr.role]="interactive() ? 'radiogroup' : 'img'"
    >
      @for (star of starList; track star) {
        <button
          type="button"
          class="rating-stars__star"
          [class.is-filled]="star <= value()"
          [attr.aria-label]="'rating.aria_label' | t : { n: star }"
          [attr.aria-pressed]="interactive() && star === value()"
          [attr.aria-hidden]="!interactive()"
          [disabled]="!interactive()"
          (click)="select(star)"
        >★</button>
      }
    </span>
  `,
  styles: [`
    .rating-stars {
      display: inline-flex;
      gap: 2px;
    }
    .rating-stars__star {
      appearance: none;
      background: transparent;
      border: 0;
      color: rgba(255,255,255,0.18);
      font-size: 18px;
      padding: 0 2px;
      cursor: default;
      line-height: 1;
      transition: color 0.15s ease, transform 0.15s ease;
    }
    .rating-stars__star.is-filled {
      color: #fbbf24;
    }
    .rating-stars[data-size="lg"] .rating-stars__star {
      font-size: 32px;
      padding: 0 4px;
    }
    .rating-stars[data-size="sm"] .rating-stars__star {
      font-size: 14px;
      padding: 0 1px;
    }
    .rating-stars__star:disabled {
      cursor: default;
    }
    .rating-stars__star:not(:disabled):hover {
      transform: scale(1.05);
    }
  `],
})
export class RatingStarsComponent {
  readonly value = input<number>(0);
  readonly max = input<number>(5);
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly interactive = input<boolean>(false);
  readonly valueChange = output<number>();

  get starList(): number[] {
    return Array.from({ length: this.max() }, (_, i) => i + 1);
  }

  select(star: number): void {
    if (!this.interactive()) return;
    this.valueChange.emit(star);
  }
}
