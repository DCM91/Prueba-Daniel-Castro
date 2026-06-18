import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { ProfileCompletionService } from '../../../core/services/profile-completion.service';
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
  imports: [TranslatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './freelancer-home.component.html',
  styleUrl: './freelancer-home.component.css',
})
export class FreelancerHomeComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly lang = inject(LanguageService);
  private readonly completion = inject(ProfileCompletionService);

  readonly currentUser = this.auth.currentUser;
  readonly profile = computed<FreelancerProfile | null>(() => this.currentUser()?.freelancer_profile ?? null);

  readonly profileCompletion = this.completion.pct;
  readonly missingRaw = this.completion.missing;

  readonly missingFields = computed<string[]>(() => {
    const raw = this.missingRaw();
    if (raw === null) {
      return [this.lang.t('home.freelancer.missing.profile')];
    }
    return raw.map((key) => this.lang.t(`home.freelancer.missing.${key}`));
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

  ngOnInit(): void {
    void this.completion.refresh();
  }

  goToEdit(): void {
    if (this.currentUser()?.freelancer_profile?.onboarding_completed_at == null) {
      void this.router.navigate(['/onboarding/welcome']);
      return;
    }
    void this.router.navigate(['/freelancer/profile/edit']);
  }
}
