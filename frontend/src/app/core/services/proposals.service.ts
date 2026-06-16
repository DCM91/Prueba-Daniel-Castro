import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { Proposal, ProposalInput } from '../types/auth.types';

@Injectable({ providedIn: 'root' })
export class ProposalsService {
  private readonly http = inject(HttpClient);

  listForBrief(briefId: number): Observable<Proposal[]> {
    return this.http
      .get<{ data: Proposal[] }>(`/api/briefs/${briefId}/proposals`)
      .pipe(map((r) => r.data));
  }

  create(briefId: number, input: ProposalInput): Observable<Proposal> {
    return this.http
      .post<{ data: Proposal }>(`/api/briefs/${briefId}/proposals`, input)
      .pipe(map((r) => r.data));
  }
}
