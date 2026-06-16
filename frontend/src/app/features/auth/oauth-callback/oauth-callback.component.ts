import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <p class="state">{{ 'auth.oauth.callback_processing' | t }}</p>
      @if (error !== null) {
        <p class="error">{{ error | t }}</p>
      }
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: #0f0f12; color: #f4f4f5; }
    .page { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 16px; }
    .state { color: #a1a1aa; }
    .error { color: #f87171; }
  `],
})
export class OAuthCallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  error: string | null = null;

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const error = params.get('error');
    if (error) {
      this.error = this.mapError(error);
      return;
    }

    const token = params.get('token');
    const expiresIn = Number(params.get('expires_in') ?? 3600);
    const newUser = params.get('new_user') === '1';

    if (!token) {
      this.error = 'auth.oauth.error_callback_failed';
      return;
    }

    this.auth.handleOAuthCallback(token, expiresIn);

    if (newUser) {
      void this.router.navigate(['/auth/complete-profile']);
    } else {
      this.auth.fetchCurrentUser().subscribe({
        next: () => void this.router.navigate(['/home']),
        error: () => void this.router.navigate(['/login']),
      });
    }
  }

  private mapError(code: string): string {
    if (code === 'access_denied' || code === 'user_cancelled_login') {
      return 'auth.oauth.error_provider_denied';
    }
    return 'auth.oauth.error_callback_failed';
  }
}
