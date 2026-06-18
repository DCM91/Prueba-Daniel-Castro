import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { FreelancerCatalogService } from '../../../core/services/freelancer-catalog.service';
import { LanguageService } from '../../../core/services/language.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { FreelancerCardComponent } from '../freelancer-card.component';
import {
  FreelancerCard,
  FreelancerSearchFilters,
  Paginated,
  SkillCategory,
} from '../../../core/types/auth.types';

interface CategoryOption {
  value: SkillCategory | '';
  label: string;
}

@Component({
  selector: 'app-freelancer-list',
  standalone: true,
  imports: [FormsModule, FreelancerCardComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './freelancer-list.component.html',
  styleUrl: './freelancer-list.component.css',
})
export class FreelancerListComponent implements OnInit {
  private readonly catalog = inject(FreelancerCatalogService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly lang = inject(LanguageService);

  readonly state = signal<'loading' | 'ready' | 'empty' | 'error'>('loading');
  readonly result = signal<Paginated<FreelancerCard> | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly q = signal<string>('');
  readonly category = signal<SkillCategory | ''>('');
  readonly city = signal<string>('');
  readonly maxRate = signal<number | null>(null);

  readonly categoryOptions: CategoryOption[] = [
    { value: '',         label: 'Todas' },
    { value: 'photo',    label: 'Fotografía' },
    { value: 'video',    label: 'Vídeo' },
    { value: 'edit',     label: 'Edición' },
    { value: 'content',  label: 'Creación de Contenido' },
  ];

  readonly hasActiveFilters = computed(() =>
    !!this.q() || !!this.category() || !!this.city() || this.maxRate() !== null,
  );

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.q.set(params.get('q') ?? '');
      this.category.set((params.get('category') as SkillCategory | null) ?? '');
      this.city.set(params.get('city') ?? '');
      const maxRateParam = params.get('max_rate');
      this.maxRate.set(maxRateParam ? Number(maxRateParam) : null);
      this.load();
    });
  }

  load(): void {
    this.state.set('loading');
    this.errorMessage.set(null);

    const filters: FreelancerSearchFilters = {
      q: this.q() || undefined,
      category: this.category() || undefined,
      city: this.city() || undefined,
      max_rate: this.maxRate() ?? undefined,
    };

    this.catalog.search(filters).subscribe({
      next: (result) => {
        this.result.set(result);
        this.state.set(result.data.length === 0 ? 'empty' : 'ready');
      },
      error: () => {
        this.errorMessage.set(this.lang.t('freelancers.list.error_body'));
        this.state.set('error');
      },
    });
  }

  applyFilters(): void {
    void this.router.navigate(['/freelancers'], {
      queryParams: this.buildQueryParams(),
    });
  }

  clearFilters(): void {
    this.q.set('');
    this.category.set('');
    this.city.set('');
    this.maxRate.set(null);
    void this.router.navigate(['/freelancers']);
  }

  goToPage(page: number): void {
    void this.router.navigate(['/freelancers'], {
      queryParams: { ...this.buildQueryParams(), page },
    });
  }

  nextPage(): void {
    const r = this.result();
    if (!r) return;
    if (r.meta.current_page < r.meta.last_page) {
      this.goToPage(r.meta.current_page + 1);
    }
  }

  prevPage(): void {
    const r = this.result();
    if (!r) return;
    if (r.meta.current_page > 1) {
      this.goToPage(r.meta.current_page - 1);
    }
  }

  private buildQueryParams(): Record<string, string | null> {
    return {
      q: this.q() || null,
      category: this.category() || null,
      city: this.city() || null,
      max_rate: this.maxRate() !== null ? String(this.maxRate()) : null,
    };
  }
}
