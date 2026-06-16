import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import {
  Brief,
  BriefInput,
  Paginated,
} from '../types/auth.types';

interface BriefListResponse {
  data: Brief[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}

@Injectable({ providedIn: 'root' })
export class BriefsService {
  private readonly http = inject(HttpClient);

  list(scope: 'all' | 'mine' = 'all', page = 1): Observable<Paginated<Brief>> {
    const params = new HttpParams()
      .set('scope', scope)
      .set('page', String(page));
    return this.http
      .get<BriefListResponse>('/api/briefs', { params })
      .pipe(map((r) => ({ data: r.data, meta: r.meta })));
  }

  getById(id: number): Observable<Brief> {
    return this.http
      .get<{ data: Brief }>(`/api/briefs/${id}`)
      .pipe(map((r) => r.data));
  }

  create(input: BriefInput): Observable<Brief> {
    return this.http
      .post<{ data: Brief }>('/api/briefs', input)
      .pipe(map((r) => r.data));
  }

  update(id: number, input: Partial<BriefInput>): Observable<Brief> {
    return this.http
      .put<{ data: Brief }>(`/api/briefs/${id}`, input)
      .pipe(map((r) => r.data));
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`/api/briefs/${id}`);
  }
}
