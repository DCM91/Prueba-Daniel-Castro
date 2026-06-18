import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { BrandLogoComponent } from '../brand-logo/brand-logo.component';
import { LanguageSelectorComponent } from '../language-selector/language-selector.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { User } from '../../types/auth.types';

export type TopbarVariant = 'public' | 'auth' | 'client' | 'freelancer';

export interface TopbarNavLink {
  labelKey: string;
  route: string;
  cta?: boolean;
}

const PUBLIC_LINKS: readonly TopbarNavLink[] = [
  { labelKey: 'topbar.nav.home', route: '/' },
  { labelKey: 'topbar.nav.professionals', route: '/freelancers' },
  { labelKey: 'topbar.nav.briefs', route: '/briefs' },
  { labelKey: 'topbar.nav.login', route: '/login' },
  { labelKey: 'topbar.nav.register', route: '/register', cta: true },
];

const CLIENT_LINKS: readonly TopbarNavLink[] = [
  { labelKey: 'topbar.nav.home', route: '/home' },
  { labelKey: 'topbar.nav.professionals', route: '/freelancers' },
  { labelKey: 'topbar.nav.briefs', route: '/briefs' },
  { labelKey: 'topbar.nav.new_brief', route: '/briefs/new', cta: true },
  { labelKey: 'topbar.nav.messages', route: '/messages' },
  { labelKey: 'topbar.nav.account', route: '/account' },
];

const FREELANCER_LINKS: readonly TopbarNavLink[] = [
  { labelKey: 'topbar.nav.home', route: '/home' },
  { labelKey: 'topbar.nav.professionals', route: '/freelancers' },
  { labelKey: 'topbar.nav.briefs', route: '/briefs' },
  { labelKey: 'topbar.nav.profile', route: '/freelancer/profile/edit' },
  { labelKey: 'topbar.nav.portfolio', route: '/freelancer/portfolio' },
  { labelKey: 'topbar.nav.messages', route: '/messages' },
  { labelKey: 'topbar.nav.account', route: '/account' },
];

const BACK_LABEL_MAP: Record<string, string> = {
  '/home': 'topbar.back_to_home',
  '/freelancers': 'topbar.back_to_catalog',
  '/briefs': 'topbar.back_to_briefs',
};

@Component({
  selector: 'app-core-topbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, BrandLogoComponent, LanguageSelectorComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css',
})
export class CoreTopbarComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly currentUrl = signal<string>(this.router.url);
  readonly mobileMenuOpen = signal<boolean>(false);

  readonly isHidden = signal<boolean>(true);

  constructor() {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
    ).subscribe(() => {
      const url = this.router.url.split('?')[0];
      this.currentUrl.set(url);
      this.isHidden.set(url === '/' || url === '/briefs');
      this.mobileMenuOpen.set(false);
    });
  }

  readonly variant = computed<TopbarVariant>(() => {
    const url = this.currentUrl();

    if (url.startsWith('/login') || url.startsWith('/register') ||
        url.startsWith('/auth/') || url.startsWith('/briefs/new') ||
        url.startsWith('/onboarding')) {
      return 'auth';
    }

    const user = this.auth.currentUser();
    if (!user) return 'public';

    if (user.role === 'freelancer') return 'freelancer';
    return 'client';
  });

  readonly navLinks = computed<readonly TopbarNavLink[]>(() => {
    switch (this.variant()) {
      case 'public': return PUBLIC_LINKS;
      case 'client': {
        // Solo los clientes reales (no agency/company/admin) pueden crear proyectos.
        const user = this.auth.currentUser();
        if (user && user.role !== 'client') {
          return CLIENT_LINKS.filter((l) => l.route !== '/briefs/new');
        }
        return CLIENT_LINKS;
      }
      case 'freelancer': return FREELANCER_LINKS;
      default: return [];
    }
  });

  readonly isSticky = computed<boolean>(() => this.variant() !== 'auth');

  readonly brandHref = computed<string>(() => {
    const v = this.variant();
    if (v === 'freelancer' || v === 'client') return '/home';
    return '/';
  });

  readonly backLink = computed<{ labelKey: string; route: string } | null>(() => {
    void this.currentUrl();
    let snapshot = this.route.snapshot;
    while (snapshot.firstChild) {
      snapshot = snapshot.firstChild;
    }
    const back = snapshot.data['backLink'] as string | undefined;
    if (!back) return null;

    const user = this.auth.currentUser();
    const resolved = back === '/home'
      ? (user?.role === 'freelancer' ? '/home/freelancer' : '/home/client')
      : back;

    return {
      labelKey: BACK_LABEL_MAP[back] ?? 'topbar.back_to_home',
      route: resolved,
    };
  });

  readonly user = computed<User | null>(() => this.auth.currentUser());

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

  readonly showUserArea = computed<boolean>(
    () => !!this.user() && this.variant() !== 'auth' && this.variant() !== 'public',
  );

  readonly showHamburger = computed<boolean>(
    () => this.navLinks().length > 0 || this.showUserArea(),
  );

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(v => !v);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  onPanelKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeMobileMenu();
      return;
    }
    if (event.key === 'Tab') {
      const panel = event.currentTarget as HTMLElement;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  onLogout(): void {
    this.closeMobileMenu();
    this.auth.logout().subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: () => this.router.navigateByUrl('/'),
    });
  }
}
