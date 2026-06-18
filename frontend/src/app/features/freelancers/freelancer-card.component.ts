import { ChangeDetectionStrategy, Component, Input, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LanguageService } from '../../core/services/language.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { FreelancerCard, ReviewRating, SkillLevel } from '../../core/types/auth.types';
import { RatingStarsComponent } from '../reviews/rating-stars/rating-stars.component';

@Component({
  selector: 'app-freelancer-card',
  standalone: true,
  imports: [RouterLink, TranslatePipe, RatingStarsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './freelancer-card.component.html',
  styleUrl: './freelancer-card.component.css',
})
export class FreelancerCardComponent {
  private readonly _freelancer = signal<FreelancerCard | null>(null);
  private readonly lang = inject(LanguageService);

  @Input({ required: true })
  set freelancer(value: FreelancerCard) {
    this._freelancer.set(value);
  }
  get freelancer(): FreelancerCard | null {
    return this._freelancer();
  }

  readonly initials = computed(() => {
    const name = this._freelancer()?.display_name ?? '';
    if (!name) return this.lang.t('freelancers.card.initials_fallback');
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || this.lang.t('freelancers.card.initials_fallback');
  });

  readonly avatarUrl = computed(() => this._freelancer()?.avatar_url ?? null);

  readonly rating = computed<ReviewRating | null>(() => {
    return this.freelancer?.rating ?? null;
  });

  readonly hourlyRateLabel = computed(() => {
    const rate = this._freelancer()?.hourly_rate;
    if (rate === null || rate === undefined) return this.lang.t('freelancers.card.rate_consult');
    return this.lang.t('freelancers.card.rate_per_hour', { rate });
  });

  readonly isAvailable = computed(() => this._freelancer()?.is_available ?? false);

  readonly skillsCount = computed(() => this._freelancer()?.skills_count ?? 0);

  readonly profileCompletion = computed(() => this._freelancer()?.profile_completion ?? 0);

  readonly detailLink = computed(() => {
    const id = this._freelancer()?.id;
    return id ? ['/freelancers', id] : ['/freelancers'];
  });

  levelLabel(level: SkillLevel | null): string {
    if (!level) return '';
    return this.lang.t('skill_levels.' + level);
  }
}
