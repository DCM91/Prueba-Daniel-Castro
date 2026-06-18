import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { BriefsService } from '../../../core/services/briefs.service';
import { AuthService } from '../../../core/services/auth.service';
import { BrandLogoComponent } from '../../../core/components/brand-logo/brand-logo.component';
import { LanguageSelectorComponent } from '../../../core/components/language-selector/language-selector.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { Brief } from '../../../core/types/auth.types';

@Component({
  selector: 'app-brief-list',
  standalone: true,
  imports: [RouterLink, BrandLogoComponent, LanguageSelectorComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './brief-list.component.html',
  styleUrl: './brief-list.component.css',
})
export class BriefListComponent implements OnInit {
  private readonly briefs = inject(BriefsService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly state = signal<'loading' | 'ready' | 'empty' | 'error'>('loading');
  readonly briefsList = signal<Brief[]>([]);
  readonly total = signal<number>(0);
  readonly currentPage = signal<number>(1);
  readonly lastPage = signal<number>(1);
  readonly scope = signal<'all' | 'mine'>('all');

  readonly currentUser = this.auth.currentUser;

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.scope.set((params.get('scope') as 'all' | 'mine') ?? 'all');
      this.currentPage.set(Number(params.get('page') ?? 1));
      this.load();
    });
  }

  load(): void {
    this.state.set('loading');
    this.briefs.list(this.scope(), this.currentPage()).subscribe({
      next: (r) => {
        this.briefsList.set(r.data);
        this.total.set(r.meta.total);
        this.currentPage.set(r.meta.current_page);
        this.lastPage.set(r.meta.last_page);
        this.state.set(r.data.length === 0 ? 'empty' : 'ready');
      },
      error: () => this.state.set('error'),
    });
  }

  changeScope(scope: 'all' | 'mine'): void {
    void this.router.navigate(['/briefs'], { queryParams: { scope, page: 1 } });
  }

  goToPage(page: number): void {
    void this.router.navigate(['/briefs'], { queryParams: { scope: this.scope(), page } });
  }

  nextPage(): void {
    if (this.currentPage() < this.lastPage()) this.goToPage(this.currentPage() + 1);
  }

  prevPage(): void {
    if (this.currentPage() > 1) this.goToPage(this.currentPage() - 1);
  }

  formatBudget(b: Brief): { key: string; params: Record<string, string | number> } | null {
    if (b.budget_min === null && b.budget_max === null) return null;
    if (b.budget_min !== null && b.budget_max !== null) {
      return { key: 'briefs.list.budget_range', params: { min: b.budget_min, max: b.budget_max } };
    }
    if (b.budget_min !== null) {
      return { key: 'briefs.list.budget_from', params: { amount: b.budget_min } };
    }
    return { key: 'briefs.list.budget_up_to', params: { amount: b.budget_max! } };
  }
}
