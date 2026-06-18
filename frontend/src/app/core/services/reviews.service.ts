import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { Review, ReviewRating } from '../types/auth.types';

export interface ReviewInput {
  rating: number;
  comment?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ReviewsService {
  private readonly http = inject(HttpClient);

  create(briefId: number, input: ReviewInput): Observable<Review> {
    return this.http
      .post<{ data: Review }>(`/api/briefs/${briefId}/reviews`, input)
      .pipe(map((r) => r.data));
  }

  listForUser(userId: number, limit = 20): Observable<Review[]> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http
      .get<{ data: Review[] }>(`/api/users/${userId}/reviews`, { params })
      .pipe(map((r) => r.data));
  }

  listForBrief(briefId: number): Observable<Review[]> {
    return this.http
      .get<{ data: Review[] }>(`/api/briefs/${briefId}/reviews`)
      .pipe(map((r) => r.data));
  }

  aggregateForUser(userId: number): Observable<ReviewRating> {
    return this.http
      .get<{ data: ReviewRating & { user_id: number } }>(`/api/users/${userId}/rating`)
      .pipe(map((r) => ({ count: r.data.count, average: r.data.average })));
  }

  completeBrief(briefId: number): Observable<void> {
    return this.http.patch<{ data: unknown }>(`/api/briefs/${briefId}/complete`, {}).pipe(map(() => undefined));
  }
}
