import { Provider } from '@angular/core';
import { signal } from '@angular/core';

import { AppLanguage, LanguageService } from '../services/language.service';

export interface TranslationMap {
  [key: string]: string | TranslationMap;
}

const flatten = (map: TranslationMap, prefix = ''): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(map)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result[fullKey] = value;
    } else {
      Object.assign(result, flatten(value, fullKey));
    }
  }
  return result;
};

const interpolate = (template: string, params?: Record<string, string | number>): string => {
  if (!params) return template;
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, name: string) =>
    name in params ? String(params[name]) : `{{${name}}}`,
  );
};

export const provideLanguageServiceMock = (
  initial: AppLanguage = 'es',
  dictionary: TranslationMap = {},
): Provider => {
  const flat = flatten(dictionary);
  const languageSignal = signal<AppLanguage>(initial);
  return {
    provide: LanguageService,
    useValue: {
      language: languageSignal,
      isReady: signal(true),
      supported: [
        { code: 'es', label: 'Español' },
        { code: 'en', label: 'English' },
      ],
      ready: Promise.resolve(),
      t: (key: string, params?: Record<string, string | number>) =>
        interpolate(flat[key] ?? key, params),
      setLanguage: (code: AppLanguage) => languageSignal.set(code),
    },
  };
};
