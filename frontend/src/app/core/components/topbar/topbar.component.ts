import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { BrandLogoComponent } from '../brand-logo/brand-logo.component';
import { LanguageSelectorComponent } from '../language-selector/language-selector.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { User } from '../../types/auth.types';

export type TopbarVariant = 'public' | 'auth' | 'client' | 'freelancer';

export interface TopbarNavLink {
  labelKey: string;
  route: string | unknown[];
}

export interface TopbarBackLink {
  labelKey: string;
  route: string | unknown[];
}

const CLIENT_DEFAULT_LINKS: readonly TopbarNavLink[] = [
  { labelKey: 'topbar.nav.home',          route: '/home' },
  { labelKey: 'topbar.nav.professionals', route: '/freelancers' },
  { labelKey: 'topbar.nav.briefs',        route: '/briefs' },
];

const FREELANCER_DEFAULT_LINKS: readonly TopbarNavLink[] = [
  { labelKey: 'topbar.nav.home',    route: '/home' },
  { labelKey: 'topbar.nav.profile', route: '/freelancer/profile/edit' },
];

@Component({
  selector: 'app-core-topbar',
  standalone: true,
  imports: [RouterLink, BrandLogoComponent, LanguageSelectorComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css',
})
export class CoreTopbarComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly variant = input.required<TopbarVariant>();
  readonly backLink = input<TopbarBackLink | null>(null);
  readonly extraLinks = input<readonly TopbarNavLink[]>([]);
  readonly langSelector = input<boolean>(true);
  readonly showUser = input<boolean>(true);

  @Output() readonly logoutClick = new EventEmitter<void>();
  @Output() readonly backClick = new EventEmitter<void>();

  readonly user = computed<User | null>(() => this.auth.currentUser());

  readonly navLinks = computed<readonly TopbarNavLink[]>(() => {
    const extra = this.extraLinks();
    if (extra.length > 0) return extra;
    if (this.variant() === 'client') return CLIENT_DEFAULT_LINKS;
    if (this.variant() === 'freelancer') return FREELANCER_DEFAULT_LINKS;
    return [];
  });

  readonly isSticky = computed<boolean>(
    () => this.variant() !== 'auth',
  );

  readonly brandHref = computed<string>(() => {
    const v = this.variant();
    if (v === 'freelancer') return '/home';
    if (v === 'client') return '/home';
    return '/';
  });

  readonly initials = computed<string>(() => {
    const name = this.user()?.name ?? '';
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?';
  });

  readonly rolePillKey = computed<string>(() => {
    const u = this.user();
    return u ? `roles.${u.role}` : '';
  });

  onLogout(): void {
    this.logoutClick.emit();
  }

  onBack(): void {
    this.backClick.emit();
  }
}
