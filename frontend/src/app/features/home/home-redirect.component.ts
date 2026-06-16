import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home-redirect',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
export class HomeRedirectComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    const user = this.auth.currentUser();
    if (user) {
      this.router.navigateByUrl(this.auth.homePathFor(user.role));
    } else {
      this.router.navigateByUrl('/login');
    }
  }
}
