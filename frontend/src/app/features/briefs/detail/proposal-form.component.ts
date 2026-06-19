import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ProposalsService } from '../../../core/services/proposals.service';
import { focusFirstInvalid } from '../../../core/utils/focus-first-invalid';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-proposal-form',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="proposal-form" [formGroup]="form" (ngSubmit)="submit()">
      <h3>{{ 'briefs.proposal_form.title' | t }}</h3>
      <label class="field">
        <span>{{ 'briefs.proposal_form.label_message' | t }}</span>
        <textarea
          rows="5"
          formControlName="message"
          [attr.placeholder]="'briefs.proposal_form.placeholder_message' | t"
        ></textarea>
      </label>
      <label class="field">
        <span>{{ 'briefs.proposal_form.label_price' | t }}</span>
        <input type="number" formControlName="price" min="0" />
      </label>

      @if (errorMessage(); as msg) {
        <p class="error error--global">{{ msg | t }}</p>
      }

      <div class="actions">
        <button class="btn btn--primary" type="submit" [disabled]="submitting()">
          {{ (submitting() ? 'briefs.proposal_form.submitting' : 'briefs.proposal_form.submit') | t }}
        </button>
      </div>
    </form>
  `,
  styles: [`
    :host { display: block; }
    .proposal-form {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 24px;
      display: flex; flex-direction: column; gap: 14px;
    }
    h3 { margin: 0; font-size: 18px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field span { font-size: 13px; color: #d4d4d8; }
    .field input, .field textarea {
      appearance: none;
      background: #0f0f12;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 8px;
      padding: 11px 12px;
      color: #f4f4f5;
      font-size: 14px;
      font-family: inherit;
    }
    .field input:focus, .field textarea:focus {
      outline: none;
      border-color: #7c3aed;
      box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.15);
    }
    .error { color: #f87171; font-size: 12px; }
    .error--global { background: rgba(248, 113, 113, 0.1); border: 1px solid rgba(248, 113, 113, 0.3); border-radius: 8px; padding: 8px 10px; margin: 0; }
    .actions { display: flex; justify-content: flex-end; }
    .btn { appearance: none; border: 0; border-radius: 10px; padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer; }
    .btn--primary { background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%); color: #fff; }
    .btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }
  `],
})
export class ProposalFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly proposals = inject(ProposalsService);
  private readonly host = inject(ElementRef<HTMLElement>);

  @Input({ required: true }) briefId!: number;
  @Output() submitted = new EventEmitter<void>();

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    message: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(2000)]],
    price:   [0,    [Validators.required, Validators.min(0)]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      focusFirstInvalid(this.form, this.host.nativeElement);
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);
    this.proposals.create(this.briefId, this.form.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.form.reset({ message: '', price: 0 });
        this.submitted.emit();
      },
      error: (err: { error?: { message?: string; errors?: Record<string, string[]> } }) => {
        this.submitting.set(false);
        if (err.error?.errors) {
          const first = Object.values(err.error.errors)[0]?.[0];
          this.errorMessage.set(first ?? 'briefs.proposal_form.error_generic');
        } else {
          this.errorMessage.set(err.error?.message ?? 'briefs.proposal_form.error_generic');
        }
      },
    });
  }
}
