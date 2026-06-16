import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export type AppLanguage = 'es' | 'en';
export type TranslationKey = string;

export interface LanguageOption {
  code: AppLanguage;
  label: string;
}

const STORAGE_KEY = 'framematch_lang';
const DEFAULT_LANGUAGE: AppLanguage = 'es';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly http = inject(HttpClient);

  readonly supported: readonly LanguageOption[] = [
    { code: 'es', label: 'Español' },
    { code: 'en', label: 'English' },
  ];

  private readonly _language = signal<AppLanguage>(this.readStoredLanguage());
  readonly language = this._language.asReadonly();
  readonly isReady = signal<boolean>(false);

  private readonly dictionaries: Record<AppLanguage, Record<string, unknown> | null> = {
    es: null,
    en: null,
  };

  readonly ready: Promise<void>;

  constructor() {
    this.ready = this.loadAll();
  }

  private async loadAll(): Promise<void> {
    await Promise.all(this.supported.map((opt) => this.load(opt.code)));
    this.isReady.set(true);
  }

  private async load(code: AppLanguage): Promise<void> {
    try {
      const dict = await firstValueFrom(
        this.http.get<Record<string, unknown>>(`/assets/i18n/${code}.json`),
      );
      this.dictionaries[code] = dict;
    } catch {
      this.dictionaries[code] = {};
    }
  }

  setLanguage(code: AppLanguage): void {
    if (code === this._language()) return;
    this._language.set(code);
    this.persist(code);
    document.documentElement.lang = code;
  }

  t(key: TranslationKey, params?: Record<string, string | number>): string {
    const value = this.lookup(key, this._language());
    if (typeof value !== 'string') {
      const fallback = this.lookup(key, DEFAULT_LANGUAGE);
      if (typeof fallback !== 'string') return key;
      return this.interpolate(fallback, params);
    }
    return this.interpolate(value, params);
  }

  private lookup(key: TranslationKey, code: AppLanguage): unknown {
    const dict = this.dictionaries[code] ?? {};
    return key.split('.').reduce<unknown>((acc, segment) => {
      if (acc && typeof acc === 'object' && segment in (acc as Record<string, unknown>)) {
        return (acc as Record<string, unknown>)[segment];
      }
      return undefined;
    }, dict);
  }

  private interpolate(template: string, params?: Record<string, string | number>): string {
    if (!params) return template;
    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, name: string) => {
      return name in params ? String(params[name]) : `{{${name}}}`;
    });
  }

  private readStoredLanguage(): AppLanguage {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as AppLanguage | null;
      if (stored && this.supported.some((opt) => opt.code === stored)) {
        return stored;
      }
    } catch {
      // ignore
    }
    if (typeof navigator !== 'undefined' && navigator.language) {
      const nav = navigator.language.toLowerCase();
      for (const opt of this.supported) {
        if (nav.startsWith(opt.code)) return opt.code;
      }
    }
    return DEFAULT_LANGUAGE;
  }

  private persist(code: AppLanguage): void {
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // ignore
    }
  }
}
