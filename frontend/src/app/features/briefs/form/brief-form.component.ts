import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { BriefsService } from '../../../core/services/briefs.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { SkillCategory } from '../../../core/types/auth.types';

@Component({
  selector: 'app-brief-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">

      <main class="main">
        <header class="page-head">
          <h1>{{ 'briefs.form.title' | t }}</h1>
          <p class="muted">{{ 'briefs.form.subtitle' | t }}</p>
        </header>

        <form class="brief-form" [formGroup]="form" (ngSubmit)="submit()">
          <label class="field">
            <span>{{ 'briefs.form.label_title' | t }}</span>
            <input type="text" formControlName="title" maxlength="120" />
            @if (form.controls.title.touched && form.controls.title.errors) {
              <small class="error">{{ 'briefs.form.title_min' | t }}</small>
            }
          </label>

          <label class="field">
            <span>{{ 'briefs.form.label_description' | t }}</span>
            <textarea rows="6" formControlName="description" maxlength="4000"></textarea>
            @if (form.controls.description.touched && form.controls.description.errors) {
              <small class="error">{{ 'briefs.form.description_min' | t }}</small>
            }
          </label>

          <div class="field-row">
            <label class="field">
              <span>{{ 'briefs.form.label_category' | t }}</span>
              <select formControlName="category">
                <option value="photo">{{ 'skill_categories.photo' | t }}</option>
                <option value="video">{{ 'skill_categories.video' | t }}</option>
                <option value="edit">{{ 'skill_categories.edit' | t }}</option>
                <option value="content">{{ 'skill_categories.content' | t }}</option>
              </select>
            </label>
            <label class="field">
              <span>{{ 'briefs.form.label_city' | t }}</span>
              <input type="text" formControlName="city" maxlength="80" />
            </label>
          </div>

          <div class="field-row">
            <label class="field">
              <span>{{ 'briefs.form.label_budget_min' | t }}</span>
              <input type="number" formControlName="budget_min" min="0" />
            </label>
            <label class="field">
              <span>{{ 'briefs.form.label_budget_max' | t }}</span>
              <input type="number" formControlName="budget_max" min="0" />
            </label>
            <label class="field">
              <span>{{ 'briefs.form.label_deadline' | t }}</span>
              <input type="date" formControlName="deadline" />
            </label>
          </div>

          @if (errorMessage(); as msg) {
            <p class="error error--global">{{ msg | t }}</p>
          }

          <div class="actions">
            <a routerLink="/briefs" class="btn btn--ghost">{{ 'common.cancel' | t }}</a>
            <button class="btn btn--primary" type="submit" [disabled]="submitting()">
              {{ submitting() ? ('briefs.form.submitting' | t) : ('briefs.form.submit' | t) }}
            </button>
          </div>
        </form>
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page { min-height: 100vh; background: #0f0f12; color: #f4f4f5; font-family: -apple-system, sans-serif; }
    .main { max-width: 720px; margin: 0 auto; padding: 32px 24px 64px; }
    .page-head h1 { margin: 0 0 6px; font-size: 28px; }
    .muted { color: #a1a1aa; margin: 0 0 24px; }
    .brief-form { display: flex; flex-direction: column; gap: 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field span { font-size: 13px; color: #d4d4d8; }
    .field input, .field select, .field textarea {
      appearance: none; background: #0f0f12; border: 1px solid rgba(255,255,255,0.14);
      border-radius: 8px; padding: 11px 12px; color: #f4f4f5; font-size: 14px; font-family: inherit;
    }
    .field input:focus, .field select:focus, .field textarea:focus {
      outline: none; border-color: #7c3aed; box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.15);
    }
    .error { color: #f87171; font-size: 12px; }
    .error--global { background: rgba(248, 113, 113, 0.1); border: 1px solid rgba(248, 113, 113, 0.3); border-radius: 8px; padding: 8px 10px; margin: 0; }
    .field-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
    .actions { display: flex; justify-content: flex-end; gap: 10px; }
    .btn { display: inline-flex; align-items: center; gap: 6px; appearance: none; border: 0; border-radius: 10px; padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer; text-decoration: none; }
    .btn--primary { background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%); color: #fff; }
    .btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn--ghost { background: transparent; color: #f4f4f5; border: 1px solid rgba(255,255,255,0.16); }
  `],
})
export class BriefFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly briefs = inject(BriefsService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(4000)]],
    category: ['photo' as SkillCategory, [Validators.required]],
    city: [''],
    budget_min: [null as number | null],
    budget_max: [null as number | null],
    deadline: [''],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);
    const raw = this.form.getRawValue();
    this.briefs.create({
      title: raw.title,
      description: raw.description,
      category: raw.category,
      city: raw.city || null,
      budget_min: raw.budget_min,
      budget_max: raw.budget_max,
      deadline: raw.deadline || null,
    }).subscribe({
      next: (b) => {
        this.submitting.set(false);
        void this.router.navigate(['/briefs', b.id]);
      },
      error: (err: { error?: { message?: string; errors?: Record<string, string[]> } }) => {
        this.submitting.set(false);
        if (err.error?.errors) {
          const first = Object.values(err.error.errors)[0]?.[0];
          this.errorMessage.set(first ?? 'briefs.form.error_generic');
        } else {
          this.errorMessage.set(err.error?.message ?? 'briefs.form.error_generic');
        }
      },
    });
  }
}
