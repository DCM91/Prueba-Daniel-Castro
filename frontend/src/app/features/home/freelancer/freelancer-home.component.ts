import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { FreelancerProfile } from '../../../core/types/auth.types';

interface Stat {
  labelKey: string;
  value: string;
  icon: string;
  hintKey: string;
}

interface Tip {
  titleKey: string;
  bodyKey: string;
  icon: string;
}

@Component({
  selector: 'app-freelancer-home',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './freelancer-home.component.html',
  styleUrl: './freelancer-home.component.css',
})
export class FreelancerHomeComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly lang = inject(LanguageService);

  readonly currentUser = this.auth.currentUser;
  readonly profile = computed<FreelancerProfile | null>(() => this.currentUser()?.freelancer_profile ?? null);

  readonly profileCompletion = computed<number>(() => {
    const p = this.profile();
    if (!p) return 0;
    let pct = 0;
    if (p.display_name && p.display_name.trim().length > 0) pct += 15;
    if (p.bio && p.bio.trim().length > 0) pct += 20;
    if (p.city && p.city.trim().length > 0) pct += 10;
    if (p.hourly_rate !== null && p.hourly_rate !== undefined) pct += 15;
    if (p.price_per_project !== null && p.price_per_project !== undefined) pct += 15;
    if (p.is_available) pct += 5;
    if (p.skills && p.skills.length > 0) pct += 20;
    return pct;
  });

  readonly missingFields = computed<string[]>(() => {
    const p = this.profile();
    if (!p) return [this.lang.t('home.freelancer.missing.profile')];
    const missing: string[] = [];
    if (!p.display_name) missing.push(this.lang.t('home.freelancer.missing.display_name'));
    if (!p.bio) missing.push(this.lang.t('home.freelancer.missing.bio'));
    if (!p.city) missing.push(this.lang.t('home.freelancer.missing.city'));
    if (p.hourly_rate === null || p.hourly_rate === undefined) missing.push(this.lang.t('home.freelancer.missing.hourly_rate'));
    if (p.price_per_project === null || p.price_per_project === undefined) missing.push(this.lang.t('home.freelancer.missing.price_per_project'));
    if (!p.skills || p.skills.length === 0) missing.push(this.lang.t('home.freelancer.missing.skills'));
    return missing;
  });

  readonly stats: Stat[] = [
    { labelKey: 'home.freelancer.stats_visits_label',   value: '0', icon: 'eye',   hintKey: 'home.freelancer.stats_visits_hint' },
    { labelKey: 'home.freelancer.stats_contacts_label', value: '0', icon: 'mail',  hintKey: 'home.freelancer.stats_contacts_hint' },
    { labelKey: 'home.freelancer.stats_jobs_label',     value: '0', icon: 'brief', hintKey: 'home.freelancer.stats_jobs_hint' },
    { labelKey: 'home.freelancer.stats_reviews_label',  value: '0', icon: 'star',  hintKey: 'home.freelancer.stats_reviews_hint' },
  ];

  readonly tips: Tip[] = [
    { titleKey: 'home.freelancer.tip1_title', bodyKey: 'home.freelancer.tip1_body', icon: 'upload' },
    { titleKey: 'home.freelancer.tip2_title', bodyKey: 'home.freelancer.tip2_body', icon: 'bolt'   },
    { titleKey: 'home.freelancer.tip3_title', bodyKey: 'home.freelancer.tip3_body', icon: 'tag'    },
  ];

  readonly avatarUrl = computed<string | null>(() => {
    const u = this.currentUser();
    if (!u) return null;
    return u.avatar_url ?? u.avatar_urls?.sm ?? null;
  });

  readonly initials = computed<string>(() => {
    const name = this.currentUser()?.name ?? this.lang.t('freelancers.card.initials_fallback');
    return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  });

  goToEdit(): void {
    this.router.navigate(['/freelancer/profile/edit']);
  }
}
