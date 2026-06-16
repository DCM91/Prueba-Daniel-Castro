import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { FreelancerCatalogService } from '../../../core/services/freelancer-catalog.service';
import { CoreTopbarComponent } from '../../../core/components/topbar/topbar.component';
import { LightboxComponent } from '../../../core/components/lightbox/lightbox.component';
import { LanguageService } from '../../../core/services/language.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { FreelancerDetail, PortfolioItem, SkillLevel } from '../../../core/types/auth.types';

@Component({
  selector: 'app-freelancer-detail',
  standalone: true,
  imports: [RouterLink, CoreTopbarComponent, LightboxComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './freelancer-detail.component.html',
  styleUrl: './freelancer-detail.component.css',
})
export class FreelancerDetailComponent implements OnInit {
  private readonly catalog = inject(FreelancerCatalogService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly lang = inject(LanguageService);

  readonly state = signal<'loading' | 'ready' | 'not-found'>('loading');
  readonly freelancer = signal<FreelancerDetail | null>(null);
  readonly bioExpanded = signal<boolean>(false);
  readonly lightboxIndex = signal<number | null>(null);

  readonly initials = computed(() => {
    const name = this.freelancer()?.display_name ?? '';
    if (!name) return this.lang.t('freelancers.card.initials_fallback');
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || this.lang.t('freelancers.card.initials_fallback');
  });

  readonly hourlyRateLabel = computed(() => {
    const r = this.freelancer()?.hourly_rate;
    if (r === null || r === undefined) return this.lang.t('freelancers.detail.rate_consult');
    return `${r}€/h`;
  });

  readonly pricePerProjectLabel = computed(() => {
    const r = this.freelancer()?.price_per_project;
    if (r === null || r === undefined) return this.lang.t('freelancers.detail.rate_project_fallback');
    return this.lang.t('freelancers.detail.rate_project_value', { price: r });
  });

  readonly skills = computed(() => this.freelancer()?.skills ?? []);
  readonly portfolios = computed<PortfolioItem[]>(() => this.freelancer()?.portfolios ?? []);

  readonly memberSinceLabel = computed(() => {
    const created = this.freelancer()?.created_at;
    if (!created) return null;
    return new Date(created).toLocaleDateString(this.lang.language() === 'en' ? 'en-US' : 'es-ES', { month: 'long', year: 'numeric' });
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);
    if (!Number.isInteger(id) || id <= 0) {
      this.state.set('not-found');
      return;
    }

    this.state.set('loading');
    this.catalog.getById(id).subscribe({
      next: (detail) => {
        this.freelancer.set(detail);
        this.state.set('ready');
      },
      error: () => {
        this.freelancer.set(null);
        this.state.set('not-found');
      },
    });
  }

  toggleBio(): void {
    this.bioExpanded.update((v) => !v);
  }

  goBack(): void {
    void this.router.navigate(['/freelancers']);
  }

  openLightbox(index: number): void {
    this.lightboxIndex.set(index);
  }

  closeLightbox(): void {
    this.lightboxIndex.set(null);
  }

  levelLabel(level: SkillLevel | null): string {
    if (!level) return '';
    return this.lang.t('skill_levels.' + level);
  }
}
