import { Injectable } from '@angular/core';

const TOKEN_KEY = 'framematch_token';
const USER_KEY  = 'framematch_user';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  getToken(): string | null {
    return this.safeGet(TOKEN_KEY);
  }

  setToken(token: string): void {
    this.safeSet(TOKEN_KEY, token);
  }

  clearToken(): void {
    this.safeRemove(TOKEN_KEY);
  }

  getUser<T>(): T | null {
    const raw = this.safeGet(USER_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  setUser<T>(user: T): void {
    this.safeSet(USER_KEY, JSON.stringify(user));
  }

  clearUser(): void {
    this.safeRemove(USER_KEY);
  }

  clearAll(): void {
    this.clearToken();
    this.clearUser();
  }

  private safeGet(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private safeSet(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore (private mode / storage full)
    }
  }

  private safeRemove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}
