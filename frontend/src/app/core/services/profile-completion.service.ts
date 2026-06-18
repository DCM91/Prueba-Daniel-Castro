import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthService } from './auth.service';

interface CompletionResponse {
  pct: number;
  missing: string[];
}

@Injectable({ providedIn: 'root' })
export class ProfileCompletionService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly _pct = signal<number | null>(null);
  private readonly _missing = signal<string[] | null>(null);
  private readonly _loading = signal<boolean>(false);
  private readonly _loadedFor = signal<string | null>(null);

  readonly pct = this._pct.asReadonly();
  readonly missing = this._missing.asReadonly();
  readonly loading = this._loading.asReadonly();

  readonly isComplete = computed<boolean>(() => (this._pct() ?? 0) >= 100);

  /**
   * Idempotente: solo recarga si el user actual no coincide con el
   * último para el que cargamos (o si nunca hemos cargado). Devuelve
   * una promesa para que la SPA pueda hacer `await refresh()` desde
   * ngOnInit sin suspense.
   */
  async refresh(force = false): Promise<void> {
    const user = this.auth.currentUser();
    if (user === null) {
      this._pct.set(null);
      this._missing.set(null);
      this._loadedFor.set(null);
      return;
    }
    if (!force && this._loadedFor() === String(user.id)) {
      return;
    }
    if (user.role !== 'freelancer') {
      this._pct.set(0);
      this._missing.set(['profile']);
      this._loadedFor.set(String(user.id));
      return;
    }

    this._loading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.get<CompletionResponse>('/api/me/completion'),
      );
      this._pct.set(res.pct);
      this._missing.set(res.missing);
      this._loadedFor.set(String(user.id));
    } catch {
      this._pct.set(null);
      this._missing.set(null);
    } finally {
      this._loading.set(false);
    }
  }

  reset(): void {
    this._pct.set(null);
    this._missing.set(null);
    this._loadedFor.set(null);
  }
}
