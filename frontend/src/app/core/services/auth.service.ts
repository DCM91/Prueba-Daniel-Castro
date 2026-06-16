import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';

import { TokenStorageService } from './token-storage.service';
import {
  AuthPayload,
  FreelancerProfile,
  LoginPayload,
  OAuthProvider,
  RegisterPayload,
  RegisterableRole,
  Role,
  User,
} from '../types/auth.types';

interface ApiEnvelope<T> { data: T }

const REFRESH_LEEWAY_SECONDS = 300;
const MIN_REFRESH_DELAY_MS = 10_000;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(TokenStorageService);
  private readonly router = inject(Router);

  private readonly _token = signal<string | null>(this.storage.getToken());
  private readonly _currentUser = signal<User | null>(this.storage.getUser<User>());

  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  readonly token = this._token.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();

  readonly isAuthenticated = computed<boolean>(() => !!this._token() && !!this._currentUser());
  readonly isClient = computed<boolean>(() => this._currentUser()?.role === 'client');
  readonly isFreelancer = computed<boolean>(() => this._currentUser()?.role === 'freelancer');
  readonly isAdmin = computed<boolean>(() => this._currentUser()?.role === 'admin');
  readonly role = computed<Role | null>(() => this._currentUser()?.role ?? null);

  hasAnyRole(roles: readonly Role[]): boolean {
    const current = this._currentUser()?.role;
    return !!current && roles.includes(current);
  }

  homePathFor(role: Role): string {
    return role === 'freelancer' ? '/home/freelancer' : '/home/client';
  }

  roleLabel(role: Role): string {
    switch (role) {
      case 'client':     return 'Cliente';
      case 'freelancer': return 'Profesional';
      case 'agency':     return 'Agencia';
      case 'company':    return 'Empresa';
      case 'admin':      return 'Admin';
    }
  }

  register(payload: RegisterPayload): Observable<AuthPayload> {
    return this.http
      .post<ApiEnvelope<AuthPayload>>('/api/auth/register', payload)
      .pipe(
        map((response) => response.data),
        tap((data) => this.persistSession(data))
      );
  }

  login(payload: LoginPayload): Observable<AuthPayload> {
    return this.http
      .post<ApiEnvelope<AuthPayload>>('/api/auth/login', payload)
      .pipe(
        map((response) => response.data),
        tap((data) => this.persistSession(data))
      );
  }

  me(): Observable<{ data: User }> {
    return this.http.get<{ data: User }>('/api/auth/me').pipe(
      tap(({ data }) => {
        this._currentUser.set(data);
        this.storage.setUser(data);
      })
    );
  }

  setFreelancerProfile(profile: FreelancerProfile): void {
    const current = this._currentUser();
    if (!current) {
      return;
    }
    const updated: User = { ...current, freelancer_profile: profile };
    this._currentUser.set(updated);
    this.storage.setUser(updated);
  }

  setCurrentUser(user: User): void {
    this._currentUser.set(user);
    this.storage.setUser(user);
  }

  logout(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('/api/auth/logout', {}).pipe(
      tap(() => this.clearSession())
    );
  }

  refresh(): Observable<AuthPayload> {
    return this.http
      .post<ApiEnvelope<AuthPayload>>('/api/auth/refresh', {})
      .pipe(
        map((response) => response.data),
        tap((data) => this.persistSession(data))
      );
  }

  loginWithOAuth(provider: OAuthProvider): void {
    window.location.href = `/api/auth/oauth/${provider}/redirect`;
  }

  handleOAuthCallback(token: string, expiresIn: number): void {
    if (!token) {
      return;
    }
    this._token.set(token);
    this.storage.setToken(token);
    const exp = this.decodeJwtExp(token);
    if (exp !== null) {
      const nowSec = Math.floor(Date.now() / 1000);
      this.scheduleRefresh(exp - nowSec);
    } else {
      this.scheduleRefresh(expiresIn);
    }
  }

  completeOAuthProfile(role: RegisterableRole): Observable<AuthPayload> {
    return this.http
      .post<ApiEnvelope<AuthPayload>>('/api/auth/oauth/complete-profile', { role })
      .pipe(
        map((response) => response.data),
        tap((data) => this.persistSession(data))
      );
  }

  fetchCurrentUser(): Observable<User> {
    return this.me().pipe(map(({ data }) => data));
  }

  clearSession(): void {
    this.cancelRefreshTimer();
    this._token.set(null);
    this._currentUser.set(null);
    this.storage.clearAll();
  }

  restoreSession(): void {
    const token = this.storage.getToken();
    const user = this.storage.getUser<User>();
    if (!token || !user) {
      return;
    }

    const exp = this.decodeJwtExp(token);
    const now = Math.floor(Date.now() / 1000);
    if (exp === null || exp <= now) {
      this.clearSession();
      return;
    }

    this._token.set(token);
    this._currentUser.set(user);
    this.scheduleRefresh(exp - now);
  }

  private persistSession(response: AuthPayload): void {
    this._token.set(response.access_token);
    this._currentUser.set(response.user);
    this.storage.setToken(response.access_token);
    this.storage.setUser(response.user);
    this.scheduleRefresh(response.expires_in);
  }

  private scheduleRefresh(secondsUntilExpiry: number): void {
    this.cancelRefreshTimer();
    const delaySeconds = Math.max(0, secondsUntilExpiry - REFRESH_LEEWAY_SECONDS);
    const delayMs = Math.max(MIN_REFRESH_DELAY_MS, delaySeconds * 1000);
    this.refreshTimer = setTimeout(() => {
      this.refresh().subscribe({
        error: () => this.clearSession(),
      });
    }, delayMs);
  }

  private cancelRefreshTimer(): void {
    if (this.refreshTimer !== null) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private decodeJwtExp(token: string): number | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(payloadJson) as { exp?: number };
      return typeof payload.exp === 'number' ? payload.exp : null;
    } catch {
      return null;
    }
  }
}
