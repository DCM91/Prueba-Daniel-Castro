import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { Notification, Paginated } from '../types/auth.types';

interface NotificationsResponse {
  data: Notification[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

interface UnreadCountResponse {
  data: { total: number };
}

interface MarkAllReadResponse {
  data: { updated: number };
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);

  list(opts: { unreadOnly?: boolean; page?: number; perPage?: number } = {}): Observable<Paginated<Notification>> {
    let params = new HttpParams();
    if (opts.unreadOnly) params = params.set('unread_only', 'true');
    if (opts.page !== undefined) params = params.set('page', String(opts.page));
    if (opts.perPage !== undefined) params = params.set('per_page', String(opts.perPage));

    return this.http.get<NotificationsResponse>('/api/me/notifications', { params }).pipe(
      map((res) => ({
        data: res.data,
        meta: res.meta,
      })),
    );
  }

  unreadCount(): Observable<number> {
    return this.http
      .get<UnreadCountResponse>('/api/me/notifications/unread-count')
      .pipe(map((res) => res.data.total));
  }

  markRead(id: string): Observable<Notification> {
    return this.http
      .post<{ data: Notification }>(`/api/me/notifications/${encodeURIComponent(id)}/read`, {})
      .pipe(map((res) => res.data));
  }

  markAllRead(): Observable<number> {
    return this.http
      .post<MarkAllReadResponse>('/api/me/notifications/read-all', {})
      .pipe(map((res) => res.data.updated));
  }
}
