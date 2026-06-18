import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { OAuthProvider, RegisterableRole } from '../../../core/types/auth.types';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly lang = inject(LanguageService);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly selectedRole = signal<RegisterableRole>(
    (this.route.snapshot.queryParamMap.get('role') as RegisterableRole) || 'client'
  );

  readonly form = this.fb.nonNullable.group(
    {
      name:                  ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email:                 ['', [Validators.required, Validators.email]],
      password:              ['', [Validators.required, Validators.minLength(8)]],
      password_confirmation: ['', [Validators.required]],
      role:                  [this.selectedRole(), [Validators.required]],
    },
    { validators: [RegisterComponent.passwordsMatch] }
  );

  private static passwordsMatch(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmation = group.get('password_confirmation')?.value;
    if (!password || !confirmation) {
      return null;
    }
    return password === confirmation ? null : { mismatch: true };
  }

  selectRole(role: RegisterableRole): void {
    this.selectedRole.set(role);
    this.form.controls.role.setValue(role);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.auth.register(this.form.getRawValue()).subscribe({
      next: () => this.router.navigate(['/home']),
      error: (err) => {
        console.error('[FrameMatch] register error', err);
        this.submitting.set(false);
        this.errorMessage.set(this.extractMessage(err));
      },
      complete: () => {
        this.submitting.set(false);
      },
    });
  }

  private extractMessage(err: unknown): string {
    const e = err as { error?: { message?: string; errors?: Record<string, string[]> } };
    if (e?.error?.errors) {
      const firstKey = Object.keys(e.error.errors)[0];
      return e.error.errors[firstKey][0];
    }
    return e?.error?.message ?? this.lang.t('auth.register.error_generic');
  }

  registerWithOAuth(provider: OAuthProvider): void {
    this.auth.loginWithOAuth(provider);
  }
}
