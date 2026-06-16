import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { BrandLogoComponent } from '../../core/components/brand-logo/brand-logo.component';
import { LanguageSelectorComponent } from '../../core/components/language-selector/language-selector.component';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, BrandLogoComponent, LanguageSelectorComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
})
export class LandingComponent {
  private readonly router = inject(Router);

  goToRegister(role: 'client' | 'freelancer'): void {
    void this.router.navigate(['/register'], { queryParams: { role } });
  }
}
