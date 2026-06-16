import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { User } from '../types/auth.types';

export interface AvatarUploadPayload {
  public_id: string;
  url: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);

  setAvatar(payload: AvatarUploadPayload): Observable<User> {
    return this.http
      .post<{ data: User }>('/api/me/avatar', payload)
      .pipe(map((r) => r.data));
  }

  removeAvatar(): Observable<User> {
    return this.http
      .delete<{ data: User }>('/api/me/avatar')
      .pipe(map((r) => r.data));
  }
}
