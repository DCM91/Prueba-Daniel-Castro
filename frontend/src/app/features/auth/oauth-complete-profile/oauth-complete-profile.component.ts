import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { RegisterableRole } from '../../../core/types/auth.types';

@Component({
  selector: 'app-oauth-complete-profile',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">

      <main class="main">
        <header class="head">
          <h1>{{ 'auth.oauth.complete_profile_title' | t }}</h1>
          <p class="lead">{{ 'auth.oauth.complete_profile_subtitle' | t }}</p>
        </header>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <fieldset class="role-selector">
            <legend class="visually-hidden">{{ 'auth.oauth.complete_profile_title' | t }}</legend>
            <label class="role" [class.role--active]="form.controls.role.value === 'client'">
              <input type="radio" formControlName="role" value="client" />
              <span class="role-title">{{ 'auth.register.role_client_title' | t }}</span>
              <span class="role-body">{{ 'auth.register.role_client_body' | t }}</span>
            </label>
            <label class="role" [class.role--active]="form.controls.role.value === 'freelancer'">
              <input type="radio" formControlName="role" value="freelancer" />
              <span class="role-title">{{ 'auth.register.role_freelancer_title' | t }}</span>
              <span class="role-body">{{ 'auth.register.role_freelancer_body' | t }}</span>
            </label>
          </fieldset>

          @if (errorMessage(); as msg) {
            <p class="error error--global">{{ msg | t }}</p>
          }

          <button type="submit" class="primary-btn" [disabled]="submitting() || form.invalid">
            {{ submitting() ? ('auth.oauth.submitting_role' | t) : ('auth.oauth.submit_role' | t) }}
          </button>
        </form>
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: #0f0f12; color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .page { min-height: 100vh; display: flex; flex-direction: column; }
    .main { max-width: 720px; width: 100%; margin: 0 auto; padding: 48px 24px 64px; }
    .head h1 { margin: 0 0 8px; font-size: 32px; }
    .lead { margin: 0 0 32px; color: #a1a1aa; }
    .role-selector { border: 0; padding: 0; margin: 0 0 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .role { display: flex; flex-direction: column; gap: 6px; padding: 18px; border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; cursor: pointer; background: rgba(255,255,255,0.02); }
    .role--active { border-color: #7c3aed; background: rgba(124,58,237,0.10); }
    .role input[type="radio"] { position: absolute; opacity: 0; pointer-events: none; }
    .role-title { font-weight: 600; }
    .role-body { color: #a1a1aa; font-size: 14px; }
    .visually-hidden { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
    .error--global { background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.3); color: #f87171; padding: 8px 10px; border-radius: 8px; margin: 0 0 16px; }
    .primary-btn { background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%); color: #fff; border: 0; border-radius: 10px; padding: 12px 22px; font-size: 15px; font-weight: 600; cursor: pointer; }
    .primary-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  `],
})
export class OAuthCompleteProfileComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = new FormGroup({
    role: new FormControl<RegisterableRole>('client', [Validators.required]),
  });

  ngOnInit(): void {
    const current = this.auth.currentUser();
    if (!current) {
      void this.router.navigate(['/login']);
      return;
    }
    if (current.role !== 'client') {
      void this.router.navigate(['/home']);
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);
    const role = this.form.controls.role.value as RegisterableRole;
    this.auth.completeOAuthProfile(role).subscribe({
      next: () => {
        this.submitting.set(false);
        void this.router.navigate(['/home']);
      },
      error: (err: { error?: { message?: string } }) => {
        this.submitting.set(false);
        this.errorMessage.set(err?.error?.message ?? 'auth.oauth.error_complete_profile');
      },
    });
  }
}
