import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { BriefsService } from '../../../core/services/briefs.service';
import { ProposalsService } from '../../../core/services/proposals.service';
import { AuthService } from '../../../core/services/auth.service';
import { CoreTopbarComponent } from '../../../core/components/topbar/topbar.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { Brief, Proposal } from '../../../core/types/auth.types';
import { ProposalFormComponent } from './proposal-form.component';

@Component({
  selector: 'app-brief-detail',
  standalone: true,
  imports: [CoreTopbarComponent, TranslatePipe, ProposalFormComponent],
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

  readonly currentUser = this.auth.currentUser;

  readonly isOwner = (): boolean => {
    const u = this.currentUser();
    const b = this.brief();
    return !!u && !!b && u.id === b.client_id;
  };

  readonly isFreelancer = (): boolean => this.currentUser()?.role === 'freelancer';

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
}
