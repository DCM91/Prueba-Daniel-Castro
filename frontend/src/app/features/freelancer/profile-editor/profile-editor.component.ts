import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, switchMap } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { CoverUploaderComponent } from '../../../core/components/cover-uploader/cover-uploader.component';
import { FreelancerProfileService } from '../../../core/services/freelancer-profile.service';
import { focusFirstInvalid } from '../../../core/utils/focus-first-invalid';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import {
  FreelancerProfile,
  FreelancerProfileSkill,
  FreelancerSkillInput,
  Skill,
  SkillLevel,
} from '../../../core/types/auth.types';

type SkillGroup = FormGroup<{
  skill_id: FormControl<number>;
  level: FormControl<SkillLevel>;
  years_experience: FormControl<number>;
}>;

@Component({
  selector: 'app-profile-editor',
  standalone: true,
  imports: [
    ReactiveFormsModule,
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
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly availableSkills = signal<Skill[]>([]);
  readonly globalErrors = signal<Record<string, string[]>>({});

  readonly currentUser = this.auth.currentUser;

  readonly skillsForm = this.fb.array<SkillGroup>([]);

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
    forkJoin({
      skills: this.profileService.getSkills(),
      profile: this.profileService.getMyProfile(),
    }).subscribe({
      next: ({ skills, profile }) => {
        this.availableSkills.set(skills);
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

  submit(): void {
    this.basicForm.markAllAsTouched();
    this.skillsForm.markAllAsTouched();

    if (this.basicForm.invalid || this.skillsForm.invalid) {
      const invalidControl = this.basicForm.invalid ? this.basicForm : this.skillsForm;
      focusFirstInvalid(invalidControl, this.host.nativeElement);
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    this.globalErrors.set({});

    const basicValue = this.basicForm.getRawValue();
    const payload: Partial<FreelancerProfile> = {
      display_name: this.nullIfEmpty(basicValue.display_name),
      bio: this.nullIfEmpty(basicValue.bio),
      city: this.nullIfEmpty(basicValue.city),
      hourly_rate: basicValue.hourly_rate,
      price_per_project: basicValue.price_per_project,
      is_available: basicValue.is_available,
    };

    const skillsPayload: FreelancerSkillInput[] = this.skillsForm.controls.map((g) => ({
      skill_id: g.controls.skill_id.value,
      level: g.controls.level.value,
      years_experience: g.controls.years_experience.value,
    }));

    this.profileService.updateMyProfile(payload).pipe(
      switchMap(() => this.profileService.syncMySkills(skillsPayload))
    ).subscribe({
      next: (updated) => {
        this.auth.setFreelancerProfile(updated);
        this.submitting.set(false);
        this.router.navigate(['/home/freelancer']);
      },
      error: (err) => this.handleSubmitError(err),
    });
  }

  cancel(): void {
    this.router.navigate(['/home/freelancer']);
  }

  onCoverUpdated(profile: FreelancerProfile): void {
    this.auth.setFreelancerProfile(profile);
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

  private handleSubmitError(err: { error?: { message?: string; errors?: Record<string, string[]> } }): void {
    console.error('[FrameMatch] profile editor submit error', err);
    this.submitting.set(false);
    this.errorMessage.set(err?.error?.message ?? 'No se pudo guardar el perfil.');
    if (err?.error?.errors) {
      this.globalErrors.set(err.error.errors);
    }
  }
}
