import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { AvatarUploaderComponent } from '../../core/components/avatar-uploader/avatar-uploader.component';
import { UserService } from '../../core/services/user.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { LinkedAccountsComponent } from './linked-accounts/linked-accounts.component';

type AccountForm = FormGroup<{
  name: FormControl<string>;
  email: FormControl<string>;
  phone: FormControl<string>;
  city: FormControl<string>;
}>;

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [ReactiveFormsModule, AvatarUploaderComponent, RouterLink, TranslatePipe, LinkedAccountsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account.component.html',
  styleUrl: './account.component.css',
})
export class AccountComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

  readonly currentUser = this.auth.currentUser;
  readonly loading = signal<boolean>(true);
  readonly submitting = signal<boolean>(false);
  readonly savedAt = signal<number | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly fieldErrors = signal<Record<string, string[]>>({});

  readonly isFreelancer = computed<boolean>(() => this.currentUser()?.role === 'freelancer');

  readonly form: AccountForm = this.fb.group({
    name:  this.fb.control('', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]),
    email: this.fb.control('', [Validators.required, Validators.email, Validators.maxLength(255)]),
    phone: this.fb.control('', [Validators.maxLength(30), Validators.pattern(/^[+0-9 ()-]{6,30}$/)]),
    city:  this.fb.control('', [Validators.maxLength(80)]),
  });

  ngOnInit(): void {
    const user = this.currentUser();
    if (!user) {
      void this.router.navigate(['/login']);
      return;
    }

    this.form.patchValue({
      name:  user.name ?? '',
      email: user.email ?? '',
      phone: user.phone ?? '',
      city:  user.city ?? '',
    });
    this.loading.set(false);
  }

  errorFor(field: keyof typeof this.form.controls): { key: string; params?: Record<string, string | number> } | null {
    const errors = this.fieldErrors()[field];
    if (errors && errors.length > 0) {
      return { key: errors[0] };
    }
    const control = this.form.controls[field];
    if (!control.touched) {
      return null;
    }
    if (control.errors?.['required']) {
      return { key: 'account.error_required' };
    }
    if (control.errors?.['email']) {
      return { key: 'account.error_email' };
    }
    if (control.errors?.['minlength']) {
      return { key: 'account.error_minlength', params: { n: control.errors['minlength'].requiredLength } };
    }
    if (control.errors?.['maxlength']) {
      return { key: 'account.error_maxlength', params: { n: control.errors['maxlength'].requiredLength } };
    }
    if (control.errors?.['pattern']) {
      return { key: 'account.error_phone_format' };
    }
    return null;
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    this.fieldErrors.set({});
    this.savedAt.set(null);

    const raw = this.form.getRawValue();
    const payload = {
      name: raw.name.trim(),
      email: raw.email.trim(),
      phone: raw.phone.trim() === '' ? null : raw.phone.trim(),
      city:  raw.city.trim() === '' ? null : raw.city.trim(),
    };

    this.userService.updateAccount(payload).subscribe({
      next: (updated) => {
        this.auth.setCurrentUser(updated);
        this.submitting.set(false);
        this.savedAt.set(Date.now());
      },
      error: (err: { error?: { message?: string; errors?: Record<string, string[]> } }) => {
        this.submitting.set(false);
        this.errorMessage.set(err?.error?.message ?? 'No se pudieron guardar los cambios.');
        if (err?.error?.errors) {
          this.fieldErrors.set(err.error.errors);
        }
      },
    });
  }

  cancel(): void {
    const user = this.currentUser();
    const target: unknown[] = user?.role === 'freelancer' ? ['/home/freelancer'] : ['/home/client'];
    void this.router.navigate(target);
  }
}
