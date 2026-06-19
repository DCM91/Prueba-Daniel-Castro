import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
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
  labelKey: string;
}

type FilterForm = FormGroup<{
  q: FormControl<string>;
  category: FormControl<SkillCategory | ''>;
  city: FormControl<string>;
  maxRate: FormControl<number | null>;
}>;

@Component({
  selector: 'app-freelancer-list',
  standalone: true,
  imports: [ReactiveFormsModule, FreelancerCardComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './freelancer-list.component.html',
  styleUrl: './freelancer-list.component.css',
})
export class FreelancerListComponent implements OnInit {
  private readonly catalog = inject(FreelancerCatalogService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly lang = inject(LanguageService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly state = signal<'loading' | 'ready' | 'empty' | 'error'>('loading');
  readonly result = signal<Paginated<FreelancerCard> | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly form: FilterForm = this.fb.group({
    q: this.fb.control(''),
    category: this.fb.control<SkillCategory | ''>(''),
    city: this.fb.control(''),
    maxRate: this.fb.control<number | null>(null),
  });

  readonly categoryOptions: CategoryOption[] = [
    { value: '',         labelKey: 'freelancers.list.category_all' },
    { value: 'photo',    labelKey: 'skill_categories.photo' },
    { value: 'video',    labelKey: 'skill_categories.video' },
    { value: 'edit',     labelKey: 'skill_categories.edit' },
    { value: 'content',  labelKey: 'skill_categories.content' },
  ];

  readonly hasActiveFilters = computed(() => {
    const v = this.form.getRawValue();
    return !!v.q || !!v.category || !!v.city || v.maxRate !== null;
  });

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const maxRateParam = params.get('max_rate');
      this.form.patchValue({
        q: params.get('q') ?? '',
        category: (params.get('category') as SkillCategory | null) ?? '',
        city: params.get('city') ?? '',
        maxRate: maxRateParam ? Number(maxRateParam) : null,
      });
      this.load();
    });
  }

  load(): void {
    this.state.set('loading');
    this.errorMessage.set(null);

    const v = this.form.getRawValue();
    const filters: FreelancerSearchFilters = {
      q: v.q || undefined,
      category: v.category || undefined,
      city: v.city || undefined,
      max_rate: v.maxRate ?? undefined,
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
    this.form.reset({ q: '', category: '', city: '', maxRate: null });
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
    const v = this.form.getRawValue();
    return {
      q: v.q || null,
      category: v.category || null,
      city: v.city || null,
      max_rate: v.maxRate !== null ? String(v.maxRate) : null,
    };
  }
}
