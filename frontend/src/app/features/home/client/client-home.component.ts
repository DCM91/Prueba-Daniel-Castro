import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { FreelancerCatalogService } from '../../../core/services/freelancer-catalog.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import {
  FreelancerCard,
  Role,
  SkillCategory,
} from '../../../core/types/auth.types';
import { FreelancerCardComponent } from '../../freelancers/freelancer-card.component';

interface Category {
  category: SkillCategory;
  description: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-client-home',
  standalone: true,
  imports: [RouterLink, FreelancerCardComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './client-home.component.html',
  styleUrl: './client-home.component.css',
})
export class ClientHomeComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly catalog = inject(FreelancerCatalogService);
  private readonly router = inject(Router);

  readonly currentUser = this.auth.currentUser;

  readonly searchTerm = signal('');
  readonly activeCategory = signal<SkillCategory | null>(null);

  readonly featured = signal<FreelancerCard[]>([]);
  readonly featuredLoading = signal<boolean>(true);

  readonly categories: Category[] = [
    { category: 'photo',   description: 'Retrato, producto, eventos, moda, inmobiliaria…', icon: 'camera',   color: 'purple' },
    { category: 'video',   description: 'Corporativo, bodas, eventos, publicidad, drone…',  icon: 'video',    color: 'cyan'   },
    { category: 'edit',    description: 'Edición de vídeo, color grading, motion graphics.', icon: 'spark',    color: 'pink'   },
    { category: 'content', description: 'Copywriting, guion, redes sociales, pódcast, newsletter y locución.', icon: 'megaphone', color: 'amber'  },
  ];

  readonly hasFeatured = computed(() => this.featured().length > 0);

  ngOnInit(): void {
    this.catalog.search({ sort: 'featured' }).subscribe({
      next: (result) => {
        this.featured.set(result.data.slice(0, 6));
        this.featuredLoading.set(false);
      },
      error: () => this.featuredLoading.set(false),
    });
  }

  toggleCategory(category: SkillCategory): void {
    this.activeCategory.update((current) => (current === category ? null : category));
  }

  roleLabel(role: Role): string {
    return this.auth.roleLabel(role);
  }

  onSearch(): void {
    const q = this.searchTerm().trim();
    const cat = this.activeCategory();
    void this.router.navigate(['/freelancers'], {
      queryParams: {
        q: q || null,
        category: cat || null,
      },
    });
  }

  goToCategory(category: SkillCategory): void {
    this.activeCategory.set(category);
    void this.router.navigate(['/freelancers'], {
      queryParams: { category },
    });
  }
}
