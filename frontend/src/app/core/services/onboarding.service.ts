import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthService } from './auth.service';

const STORAGE_KEY = 'framematch_onboarding_step';

export const ONBOARDING_STEPS = [
  'welcome',
  'datos',
  'avatar',
  'bio-tarifa',
  'skills',
  'cover-portfolio',
  'done',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const ONBOARDING_TOTAL_STEPS = 6;

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly _step = signal<OnboardingStep>(this.restoreStep());
  private readonly _submitting = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  readonly step = this._step.asReadonly();
  readonly submitting = this._submitting.asReadonly();
  readonly error = this._error.asReadonly();

  readonly stepIndex = computed<number>(() => ONBOARDING_STEPS.indexOf(this._step()));
  readonly progressPct = computed<number>(() => {
    const i = this.stepIndex();
    if (i <= 0) return 0;
    if (i >= ONBOARDING_TOTAL_STEPS) return 100;
    return Math.round((i / ONBOARDING_TOTAL_STEPS) * 100);
  });

  readonly isComplete = computed<boolean>(() => {
    const user = this.auth.currentUser();
    if (user?.role !== 'freelancer') return true;
    return user.freelancer_profile?.onboarding_completed_at != null;
  });

  setStep(step: OnboardingStep): void {
    this._step.set(step);
    this.persistStep(step);
  }

  goNext(): void {
    const idx = this.stepIndex();
    if (idx < 0 || idx >= ONBOARDING_STEPS.length - 1) return;
    const next = ONBOARDING_STEPS[idx + 1];
    if (next !== undefined) {
      this.setStep(next);
    }
  }

  goPrev(): void {
    const idx = this.stepIndex();
    if (idx <= 1) return;
    const prev = ONBOARDING_STEPS[idx - 1];
    if (prev !== undefined) {
      this.setStep(prev);
    }
  }

  skip(): void {
    if (this._step() === 'cover-portfolio') {
      this.setStep('done');
    }
  }

  async complete(): Promise<boolean> {
    this._submitting.set(true);
    this._error.set(null);
    try {
      await firstValueFrom(this.http.post('/api/me/onboarding-complete', {}));
      this.setStep('done');
      this.clearStorage();
      return true;
    } catch (err: unknown) {
      const e = err as { error?: { message?: string } };
      this._error.set(e?.error?.message ?? 'No se pudo completar el onboarding.');
      return false;
    } finally {
      this._submitting.set(false);
    }
  }

  reset(): void {
    this._step.set('welcome');
    this._error.set(null);
    this.clearStorage();
  }

  setSubmitting(value: boolean): void {
    this._submitting.set(value);
  }

  setError(value: string | null): void {
    this._error.set(value);
  }

  private restoreStep(): OnboardingStep {
    if (typeof localStorage === 'undefined') return 'welcome';
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw && (ONBOARDING_STEPS as readonly string[]).includes(raw)) {
        return raw as OnboardingStep;
      }
    } catch {
      // ignore
    }
    return 'welcome';
  }

  private persistStep(step: OnboardingStep): void {
    if (typeof localStorage === 'undefined') return;
    try {
      if (step === 'done') {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      localStorage.setItem(STORAGE_KEY, step);
    } catch {
      // ignore
    }
  }

  private clearStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
