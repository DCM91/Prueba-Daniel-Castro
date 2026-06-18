import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { OnboardingService, OnboardingStep } from '../../../core/services/onboarding.service';
import { ProfileCompletionService } from '../../../core/services/profile-completion.service';
import { FreelancerProfileService } from '../../../core/services/freelancer-profile.service';
import { UserService } from '../../../core/services/user.service';
import { Skill, User } from '../../../core/types/auth.types';
import { AvatarUploaderComponent } from '../../../core/components/avatar-uploader/avatar-uploader.component';
import { CoverUploaderComponent } from '../../../core/components/cover-uploader/cover-uploader.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

type DatosForm = FormGroup<{
  name:  FormControl<string>;
  email: FormControl<string>;
  phone: FormControl<string>;
  city:  FormControl<string>;
}>;

type BioForm = FormGroup<{
  display_name:      FormControl<string>;
  bio:               FormControl<string>;
  hourly_rate:       FormControl<number | null>;
  price_per_project: FormControl<number | null>;
}>;

const PHONE_PATTERN = /^[+0-9 ()-]{6,30}$/;

@Component({
  selector: 'app-onboarding-wizard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    AvatarUploaderComponent,
    CoverUploaderComponent,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './onboarding-wizard.component.html',
  styleUrl: './onboarding-wizard.component.css',
})
export class OnboardingWizardComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  readonly onboarding = inject(OnboardingService);
  private readonly completion = inject(ProfileCompletionService);
  private readonly freelancerProfile = inject(FreelancerProfileService);
  private readonly userService = inject(UserService);

  readonly currentUser = this.auth.currentUser;
  readonly step = this.onboarding.step;
  readonly stepIndex = this.onboarding.stepIndex;
  readonly progressPct = this.onboarding.progressPct;
  readonly submitting = this.onboarding.submitting;
  readonly errorMessage = this.onboarding.error;

  readonly allSkills = signal<Skill[]>([]);
  readonly selectedSkillIds = signal<number[]>([]);
  readonly skillLevels = signal<Record<number, { level: 'junior' | 'mid' | 'senior'; years_experience: number }>>({});

  readonly datosForm: DatosForm = this.fb.group({
    name:  this.fb.control('', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]),
    email: this.fb.control('', [Validators.required, Validators.email, Validators.maxLength(255)]),
    phone: this.fb.control('', [Validators.maxLength(30), Validators.pattern(PHONE_PATTERN)]),
    city:  this.fb.control('', [Validators.maxLength(80)]),
  });

  readonly bioForm: BioForm = this.fb.group({
    display_name:      this.fb.control('', [Validators.maxLength(100)]),
    bio:               this.fb.control('', [Validators.maxLength(1000)]),
    hourly_rate:       this.fb.control<number | null>(null, [Validators.min(0)]),
    price_per_project: this.fb.control<number | null>(null, [Validators.min(0)]),
  });

  readonly selectedSkills = computed<Skill[]>(() => {
    const ids = new Set(this.selectedSkillIds());
    return this.allSkills().filter((s) => ids.has(s.id));
  });

  readonly canGoPrev = computed<boolean>(() => this.stepIndex() > 1);

  readonly STEPS = ['welcome', 'datos', 'avatar', 'bio-tarifa', 'skills', 'cover-portfolio', 'done'] as const;

  ngOnInit(): void {
    this.prefillFromCurrentUser();
    void this.loadSkills();
  }

  private prefillFromCurrentUser(): void {
    const user = this.currentUser();
    if (user === null) {
      void this.router.navigate(['/login']);
      return;
    }
    this.datosForm.patchValue({
      name:  user.name ?? '',
      email: user.email ?? '',
      phone: user.phone ?? '',
      city:  user.city ?? '',
    });

    const profile = user.freelancer_profile;
    if (profile) {
      this.bioForm.patchValue({
        display_name:      profile.display_name ?? '',
        bio:               profile.bio ?? '',
        hourly_rate:       profile.hourly_rate ?? null,
        price_per_project: profile.price_per_project ?? null,
      });
      this.selectedSkillIds.set(profile.skills.map((s) => s.id));
      const levels: Record<number, { level: 'junior' | 'mid' | 'senior'; years_experience: number }> = {};
      for (const ps of profile.skills) {
        const level = (ps.level ?? 'mid') as 'junior' | 'mid' | 'senior';
        levels[ps.id] = { level, years_experience: ps.years_experience ?? 0 };
      }
      this.skillLevels.set(levels);
    }
  }

  private async loadSkills(): Promise<void> {
    try {
      const res = await fetch('/api/skills');
      if (!res.ok) return;
      const json = await res.json() as { data: Skill[] };
      this.allSkills.set(json.data ?? []);
    } catch {
      // ignore — user can still skip this step
    }
  }

  start(): void {
    this.onboarding.setStep('datos');
  }

  goPrev(): void {
    this.onboarding.goPrev();
  }

  async saveDatos(): Promise<void> {
    if (this.datosForm.invalid) {
      this.datosForm.markAllAsTouched();
      return;
    }
    const raw = this.datosForm.getRawValue();
    this.onboarding.setSubmitting(true);
    this.onboarding.setError(null);
    try {
      const updated = await new Promise<User>((resolve, reject) => {
        this.userService.updateAccount({
          name:  raw.name.trim(),
          email: raw.email.trim(),
          phone: raw.phone.trim() === '' ? null : raw.phone.trim(),
          city:  raw.city.trim() === '' ? null : raw.city.trim(),
        }).subscribe({ next: resolve, error: reject });
      });
      this.auth.setCurrentUser(updated);
      this.onboarding.setSubmitting(false);
      this.onboarding.goNext();
    } catch (err) {
      this.onboarding.setSubmitting(false);
      this.onboarding.setError(this.errorText(err));
    }
  }

  async saveBio(): Promise<void> {
    if (this.bioForm.invalid) {
      this.bioForm.markAllAsTouched();
      return;
    }
    const raw = this.bioForm.getRawValue();
    const toNumOrNull = (n: number | null): number | null =>
      n === null || Number.isNaN(n) ? null : n;
    this.onboarding.setSubmitting(true);
    this.onboarding.setError(null);
    try {
      await new Promise<void>((resolve, reject) => {
        this.freelancerProfile.updateMyProfile({
          display_name:      raw.display_name.trim() === '' ? null : raw.display_name.trim(),
          bio:               raw.bio.trim() === '' ? null : raw.bio.trim(),
          hourly_rate:       toNumOrNull(raw.hourly_rate),
          price_per_project: toNumOrNull(raw.price_per_project),
        }).subscribe({ next: () => resolve(), error: reject });
      });
      const user = await firstValueFrom(this.http.get<{ data: User }>('/api/auth/me'));
      this.auth.setCurrentUser(user.data);
      this.onboarding.setSubmitting(false);
      this.onboarding.goNext();
    } catch (err) {
      this.onboarding.setSubmitting(false);
      this.onboarding.setError(this.errorText(err));
    }
  }

  async saveSkills(): Promise<void> {
    const ids = this.selectedSkillIds();
    if (ids.length === 0) {
      this.onboarding.goNext();
      return;
    }
    const skills = ids.map((id) => {
      const meta = this.skillLevels()[id] ?? { level: 'mid' as const, years_experience: 0 };
      return {
        skill_id: id,
        level: meta.level,
        years_experience: Number(meta.years_experience) || 0,
      };
    });
    this.onboarding.setSubmitting(true);
    this.onboarding.setError(null);
    try {
      await new Promise<void>((resolve, reject) => {
        this.freelancerProfile.syncMySkills(skills).subscribe({ next: () => resolve(), error: reject });
      });
      const user = await firstValueFrom(this.http.get<{ data: User }>('/api/auth/me'));
      this.auth.setCurrentUser(user.data);
      this.onboarding.setSubmitting(false);
      this.onboarding.goNext();
    } catch (err) {
      this.onboarding.setSubmitting(false);
      this.onboarding.setError(this.errorText(err));
    }
  }

  skipCover(): void {
    this.onboarding.skip();
  }

  async finish(): Promise<void> {
    const ok = await this.onboarding.complete();
    if (ok) {
      void this.completion.refresh(true);
      void this.router.navigate(['/home/freelancer']);
    }
  }

  toggleSkill(id: number): void {
    const current = this.selectedSkillIds();
    if (current.includes(id)) {
      this.selectedSkillIds.set(current.filter((x) => x !== id));
    } else {
      this.selectedSkillIds.set([...current, id]);
    }
  }

  isSelected(id: number): boolean {
    return this.selectedSkillIds().includes(id);
  }

  setSkillLevel(id: number, level: 'junior' | 'mid' | 'senior'): void {
    this.skillLevels.update((s) => ({
      ...s,
      [id]: { level, years_experience: s[id]?.years_experience ?? 0 },
    }));
  }

  setSkillYears(id: number, years: number): void {
    const safe = Number.isFinite(years) && years >= 0 ? Math.floor(years) : 0;
    this.skillLevels.update((s) => ({
      ...s,
      [id]: { level: s[id]?.level ?? 'mid', years_experience: safe },
    }));
  }

  getSkillLevel(id: number): 'junior' | 'mid' | 'senior' {
    return this.skillLevels()[id]?.level ?? 'mid';
  }

  getSkillYears(id: number): number {
    return this.skillLevels()[id]?.years_experience ?? 0;
  }

  stepLabel(step: OnboardingStep): string {
    return `onboarding.step.${step}.label`;
  }

  errorForDatos(field: 'name' | 'email' | 'phone' | 'city'): string | null {
    const c = this.datosForm.controls[field];
    if (!c.touched) return null;
    if (c.errors?.['required']) return 'auth.register.name_required';
    if (c.errors?.['email']) return 'auth.register.email_required';
    if (c.errors?.['pattern']) return 'auth.oauth.error_complete_profile';
    if (c.errors?.['minlength']) {
      return `auth.register.password_min`;
    }
    if (c.errors?.['maxlength']) return 'common.error';
    return null;
  }

  errorForBio(field: 'display_name' | 'bio' | 'hourly_rate' | 'price_per_project'): string | null {
    const c = this.bioForm.controls[field];
    if (!c.touched) return null;
    if (c.errors?.['min']) return 'profile_editor.error_save';
    if (c.errors?.['maxlength']) return 'profile_editor.error_save';
    return null;
  }

  onAvatarUpdated(_user: User): void {
    // re-cargar el currentUser del auth para reflejar el avatar nuevo
    const cur = this.auth.currentUser();
    if (cur) {
      this.auth.setCurrentUser({ ...cur, avatar_url: _user.avatar_url, avatar_urls: _user.avatar_urls });
    }
  }

  onCoverUpdated(): void {
    // el cover uploader ya hace setFreelancerProfile internamente
  }

  private errorText(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { message?: string; errors?: Record<string, string[]> } | null;
      if (body?.message) return body.message;
      if (body?.errors) {
        const first = Object.values(body.errors)[0]?.[0];
        if (first) return first;
      }
      if (err.status === 0) return 'uploader.error_network';
      return 'profile_editor.error_save';
    }
    return 'profile_editor.error_save';
  }
}
