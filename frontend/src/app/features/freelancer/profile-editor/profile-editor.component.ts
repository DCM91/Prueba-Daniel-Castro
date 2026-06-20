import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable, forkJoin, of, switchMap } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { AvatarUploaderComponent } from '../../../core/components/avatar-uploader/avatar-uploader.component';
import { CoverUploaderComponent } from '../../../core/components/cover-uploader/cover-uploader.component';
import { FreelancerProfileService } from '../../../core/services/freelancer-profile.service';
import { UserService } from '../../../core/services/user.service';
import { focusFirstInvalid } from '../../../core/utils/focus-first-invalid';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import {
  FreelancerProfile,
  FreelancerProfileSkill,
  FreelancerSkillInput,
  Skill,
  SkillLevel,
  User,
} from '../../../core/types/auth.types';

type SkillGroup = FormGroup<{
  skill_id: FormControl<number>;
  level: FormControl<SkillLevel>;
  years_experience: FormControl<number>;
}>;

type PersonalForm = FormGroup<{
  name:  FormControl<string>;
  email: FormControl<string>;
  phone: FormControl<string>;
  city:  FormControl<string>;
}>;

const PHONE_PATTERN = /^[+0-9 ()-]{6,30}$/;

@Component({
  selector: 'app-profile-editor',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    AvatarUploaderComponent,
    CoverUploaderComponent,
    RouterLink,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-editor.component.html',
  styleUrl: './profile-editor.component.css',
})
export class ProfileEditorComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly profileService = inject(FreelancerProfileService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly availableSkills = signal<Skill[]>([]);
  readonly globalErrors = signal<Record<string, string[]>>({});
  readonly personalErrors = signal<Record<string, string[]>>({});
  readonly personalSaved = signal<boolean>(false);

  readonly currentUser = this.auth.currentUser;

  readonly skillsForm = this.fb.array<SkillGroup>([]);

  readonly personalForm: PersonalForm = this.fb.group({
    name:  this.fb.control('', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]),
    email: this.fb.control('', [Validators.required, Validators.email, Validators.maxLength(255)]),
    phone: this.fb.control('', [Validators.maxLength(30), Validators.pattern(PHONE_PATTERN)]),
    city:  this.fb.control('', [Validators.maxLength(80)]),
  });

  readonly basicForm = this.fb.group({
    display_name: this.fb.control('', [Validators.maxLength(100)]),
    bio: this.fb.control('', [Validators.maxLength(1000)]),
    city: this.fb.control('', [Validators.maxLength(80)]),
    hourly_rate: this.fb.control<number | null>(null, [Validators.min(0)]),
    price_per_project: this.fb.control<number | null>(null, [Validators.min(0)]),
    is_available: this.fb.control(true, []),
    skills: this.skillsForm,
  });

  readonly selectedSkillIds = computed<Set<number>>(() => {
    return new Set(this.skillsForm.controls.map((g) => g.controls.skill_id.value));
  });

  ngOnInit(): void {
    const profile$ = this.profileService.getMyProfile();
    forkJoin({
      skills: this.profileService.getSkills(),
      profile: profile$,
    }).subscribe({
      next: ({ skills, profile }) => {
        this.availableSkills.set(skills);
        this.populatePersonalForm(this.currentUser());
        this.populateForm(profile);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('[FrameMatch] profile editor load error', err);
        this.errorMessage.set(
          err?.error?.message ?? 'No se pudo cargar tu perfil. Inténtalo de nuevo.'
        );
        this.loading.set(false);
      },
    });
  }

  toggleSkill(skill: Skill): void {
    const id = skill.id;
    const existingIndex = this.skillsForm.controls.findIndex(
      (g) => g.controls.skill_id.value === id
    );

    if (existingIndex >= 0) {
      this.skillsForm.removeAt(existingIndex);
      return;
    }

    const existing = this.findExistingSkill(id);
    this.skillsForm.push(
      this.fb.group({
        skill_id: this.fb.control(id, [Validators.required]),
        level: this.fb.control<SkillLevel>(existing?.level ?? 'mid', [Validators.required]),
        years_experience: this.fb.control<number>(existing?.years_experience ?? 0, [
          Validators.required,
          Validators.min(0),
          Validators.max(50),
        ]),
      })
    );
  }

  removeSkillAt(index: number): void {
    this.skillsForm.removeAt(index);
  }

  isSelected(skill: Skill): boolean {
    return this.selectedSkillIds().has(skill.id);
  }

  skillNameFor(skillId: number): string {
    return this.availableSkills().find((s) => s.id === skillId)?.name ?? '';
  }

  errorFor(controlName: string): string | null {
    const errs = this.globalErrors()[controlName];
    return errs && errs.length > 0 ? errs[0] : null;
  }

  errorForPersonal(field: 'name' | 'email' | 'phone' | 'city'): { key: string; params?: Record<string, string | number> } | null {
    const fromServer = this.personalErrors()[field];
    if (fromServer && fromServer.length > 0) {
      return { key: fromServer[0] };
    }
    const control = this.personalForm.controls[field];
    if (!control.touched) return null;
    if (control.errors?.['required']) return { key: 'account.error_required' };
    if (control.errors?.['email']) return { key: 'account.error_email' };
    if (control.errors?.['minlength']) {
      return { key: 'account.error_minlength', params: { n: control.errors['minlength'].requiredLength } };
    }
    if (control.errors?.['maxlength']) {
      return { key: 'account.error_maxlength', params: { n: control.errors['maxlength'].requiredLength } };
    }
    if (control.errors?.['pattern']) return { key: 'account.error_phone_format' };
    return null;
  }

  submit(): void {
    this.personalForm.markAllAsTouched();
    this.basicForm.markAllAsTouched();
    this.skillsForm.markAllAsTouched();
    this.errorMessage.set(null);
    this.globalErrors.set({});
    this.personalErrors.set({});
    this.personalSaved.set(false);

    const personalValid = this.personalForm.valid;
    const professionalValid = this.basicForm.valid && this.skillsForm.valid;

    if (!personalValid && !professionalValid) {
      const invalid = !personalValid ? this.personalForm : this.basicForm;
      focusFirstInvalid(invalid, this.host.nativeElement);
      return;
    }

    this.submitting.set(true);

    const observables: Observable<unknown>[] = [];

    if (personalValid) {
      const raw = this.personalForm.getRawValue();
      observables.push(this.userService.updateAccount({
        name:  raw.name.trim(),
        email: raw.email.trim(),
        phone: raw.phone.trim() === '' ? null : raw.phone.trim(),
        city:  raw.city.trim() === '' ? null : raw.city.trim(),
      }));
    }

    if (professionalValid) {
      const raw = this.basicForm.getRawValue();
      const payload: Partial<FreelancerProfile> = {
        display_name: this.nullIfEmpty(raw.display_name),
        bio: this.nullIfEmpty(raw.bio),
        city: this.nullIfEmpty(raw.city),
        hourly_rate: raw.hourly_rate,
        price_per_project: raw.price_per_project,
        is_available: raw.is_available,
      };
      const skillsPayload: FreelancerSkillInput[] = this.skillsForm.controls.map((g) => ({
        skill_id: g.controls.skill_id.value,
        level: g.controls.level.value,
        years_experience: g.controls.years_experience.value,
      }));
      observables.push(
        this.profileService.updateMyProfile(payload).pipe(
          switchMap((updatedProfile) => forkJoin({
            profile: of(updatedProfile),
            skills: this.profileService.syncMySkills(skillsPayload),
          })),
        ),
      );
    }

    forkJoin(observables).subscribe({
      next: (results) => {
        for (const r of results) {
          if (r && typeof r === 'object' && 'name' in r) {
            this.auth.setCurrentUser(r as User);
            this.personalSaved.set(true);
          } else if (r && typeof r === 'object' && 'profile' in r) {
            const { profile } = r as { profile: FreelancerProfile | null };
            if (profile) this.auth.setFreelancerProfile(profile);
          }
        }
      },
      complete: () => {
        this.submitting.set(false);
        if (professionalValid) {
          void this.router.navigate(['/home/freelancer']);
        }
      },
      error: (err: { error?: { message?: string; errors?: Record<string, string[]> } } & { status?: number }) => {
        this.submitting.set(false);
        this.errorMessage.set(err?.error?.message ?? 'No se pudo guardar.');
        if (err?.error?.errors) {
          if (err.status === 422 && personalValid && !professionalValid) {
            this.personalErrors.set(err.error.errors);
          } else {
            this.globalErrors.set(err.error.errors);
          }
        }
      },
    });
  }

  cancel(): void {
    void this.router.navigate(['/home/freelancer']);
  }

  onCoverUpdated(profile: FreelancerProfile): void {
    this.auth.setFreelancerProfile(profile);
  }

  onAvatarUpdated(updated: User): void {
    this.auth.setCurrentUser(updated);
  }

  private populatePersonalForm(user: User | null): void {
    if (!user) return;
    this.personalForm.patchValue({
      name:  user.name ?? '',
      email: user.email ?? '',
      phone: user.phone ?? '',
      city:  user.city ?? '',
    });
  }

  private populateForm(profile: FreelancerProfile): void {
    this.basicForm.patchValue({
      display_name: profile.display_name ?? '',
      bio: profile.bio ?? '',
      city: profile.city ?? '',
      hourly_rate: profile.hourly_rate,
      price_per_project: profile.price_per_project,
      is_available: profile.is_available,
    });

    this.skillsForm.clear();
    for (const skill of profile.skills ?? []) {
      this.skillsForm.push(
        this.fb.group({
          skill_id: this.fb.control(skill.id, [Validators.required]),
          level: this.fb.control<SkillLevel>(skill.level ?? 'mid', [Validators.required]),
          years_experience: this.fb.control<number>(skill.years_experience ?? 0, [
            Validators.required,
            Validators.min(0),
            Validators.max(50),
          ]),
        })
      );
    }
  }

  private findExistingSkill(skillId: number): FreelancerProfileSkill | null {
    return this.auth.currentUser()?.freelancer_profile?.skills?.find((s) => s.id === skillId) ?? null;
  }

  private nullIfEmpty(value: string): string | null {
    return value && value.trim().length > 0 ? value : null;
  }
}
