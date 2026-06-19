import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { BriefsService } from '../../../core/services/briefs.service';
import { ProposalsService } from '../../../core/services/proposals.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { Brief, BriefAttachment, Proposal } from '../../../core/types/auth.types';
import { ProposalFormComponent } from './proposal-form.component';
import { BriefAttachmentUploaderComponent } from '../brief-attachment-uploader/brief-attachment-uploader.component';
import { ReviewsSectionComponent } from '../../reviews/reviews-section/reviews-section.component';

@Component({
  selector: 'app-brief-detail',
  standalone: true,
  imports: [TranslatePipe, ProposalFormComponent, BriefAttachmentUploaderComponent, ReviewsSectionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './brief-detail.component.html',
  styleUrl: './brief-detail.component.css',
})
export class BriefDetailComponent implements OnInit {
  private readonly briefs = inject(BriefsService);
  private readonly proposals = inject(ProposalsService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly state = signal<'loading' | 'ready' | 'not-found'>('loading');
  readonly brief = signal<Brief | null>(null);
  readonly proposalsList = signal<Proposal[]>([]);
  readonly showProposalForm = signal<boolean>(false);
  readonly attachments = signal<BriefAttachment[]>([]);

  readonly currentUser = this.auth.currentUser;

  readonly isOwner = (): boolean => {
    const u = this.currentUser();
    const b = this.brief();
    return !!u && !!b && u.id === b.client_id;
  };

  readonly isFreelancer = (): boolean => this.currentUser()?.role === 'freelancer';

  readonly budgetDisplay = computed<
    | { mode: 'none' }
    | { mode: 'range'; min: number; max: number }
    | { mode: 'from'; min: number }
    | { mode: 'up_to'; max: number }
  >(() => {
    const b = this.brief();
    if (b === null) return { mode: 'none' };
    const { budget_min: min, budget_max: max } = b;
    if (min === null && max === null) return { mode: 'none' };
    if (min !== null && max !== null) return { mode: 'range', min, max };
    if (min !== null) return { mode: 'from', min };
    return { mode: 'up_to', max: max as number };
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);
    if (!Number.isInteger(id) || id <= 0) {
      this.state.set('not-found');
      return;
    }
    this.load(id);
  }

  load(id: number): void {
    this.state.set('loading');
    this.briefs.getById(id).subscribe({
      next: (b) => {
        this.brief.set(b);
        this.attachments.set(b.attachments ?? []);
        this.state.set('ready');
        if (this.isOwner()) {
          this.proposals.listForBrief(id).subscribe({
            next: (list) => this.proposalsList.set(list),
            error: () => this.proposalsList.set([]),
          });
        }
      },
      error: () => this.state.set('not-found'),
    });
  }

  toggleForm(): void {
    this.showProposalForm.update((v) => !v);
  }

  updateProposalStatus(proposal: Proposal, status: 'accepted' | 'rejected'): void {
    const brief = this.brief();
    if (brief === null) return;

    this.proposals.updateStatus(brief.id, proposal.id, status).subscribe({
      next: ({ proposal: updatedProposal, brief: updatedBrief }) => {
        this.proposalsList.update((list) =>
          list.map((p) => (p.id === updatedProposal.id ? updatedProposal : p)),
        );
        this.brief.set({ ...brief, status: updatedBrief.status as Brief['status'] });
      },
    });
  }

  onAttachmentsChange(updated: BriefAttachment[]): void {
    this.attachments.set(updated);
    const b = this.brief();
    if (b !== null) {
      this.brief.set({ ...b, attachments: updated });
    }
  }

  freelancerIdFor(): number | null {
    const accepted = this.proposalsList().find((p) => p.status === 'accepted');
    return accepted?.freelancer?.user_id ?? null;
  }
}
