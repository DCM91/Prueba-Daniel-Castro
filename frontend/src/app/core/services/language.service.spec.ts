import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { LanguageService } from './language.service';

describe('LanguageService', () => {
  let service: LanguageService;
  let httpMock: HttpTestingController;

  const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

  const flushAll = (payloads: Record<string, Record<string, unknown>> = {}): void => {
    httpMock.match('/assets/i18n/es.json').forEach((c) => c.flush(payloads['es.json'] ?? {}));
    httpMock.match('/assets/i18n/en.json').forEach((c) => c.flush(payloads['en.json'] ?? {}));
  };

  const buildService = (): LanguageService => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.inject(LanguageService);
  };

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('loads es.json and en.json on construction', async () => {
    service = buildService();
    flushAll({
      'es.json': { app: { brand: 'FrameMatch' } },
      'en.json': { app: { brand: 'FrameMatch' } },
    });
    await tick();
    expect(service.isReady()).toBe(true);
  });

  it('t() returns the translated value for the active language', async () => {
    localStorage.setItem('framematch_lang', 'es');
    service = buildService();
    flushAll({
      'es.json': { common: { search: 'Buscar' } },
      'en.json': { common: { search: 'Search' } },
    });
    await tick();
    expect(service.t('common.search')).toBe('Buscar');
    service.setLanguage('en');
    expect(service.t('common.search')).toBe('Search');
  });

  it('t() interpolates params with {{name}}', async () => {
    localStorage.setItem('framematch_lang', 'es');
    service = buildService();
    flushAll({
      'es.json': { home: { freelancer: { greeting: 'Hola, {{name}}' } } },
      'en.json': {},
    });
    await tick();
    expect(service.t('home.freelancer.greeting', { name: 'Lucia' })).toBe('Hola, Lucia');
  });

  it('t() falls back to the key when the translation is missing', async () => {
    localStorage.setItem('framematch_lang', 'es');
    service = buildService();
    flushAll();
    await tick();
    expect(service.t('not.translated.key')).toBe('not.translated.key');
  });

  it('setLanguage persists the choice in localStorage', async () => {
    localStorage.setItem('framematch_lang', 'es');
    service = buildService();
    flushAll();
    await tick();
    service.setLanguage('en');
    expect(localStorage.getItem('framematch_lang')).toBe('en');
  });

  it('falls back to en (browser default in jsdom) when the stored language is invalid', async () => {
    localStorage.setItem('framematch_lang', 'fr');
    const fresh = buildService();
    httpMock.match('/assets/i18n/es.json').forEach((c) => c.flush({}));
    httpMock.match('/assets/i18n/en.json').forEach((c) => c.flush({}));
    await tick();
    expect(fresh.language()).toBe('en');
  });

  it('exposes a ready promise that resolves only after both dictionaries load', async () => {
    service = buildService();
    expect(service.isReady()).toBe(false);
    httpMock.match('/assets/i18n/es.json').forEach((c) => c.flush({}));
    expect(service.isReady()).toBe(false);
    httpMock.match('/assets/i18n/en.json').forEach((c) => c.flush({}));
    await service.ready;
    expect(service.isReady()).toBe(true);
  });

  it('detects es from navigator.language when no preference is stored', async () => {
    jest.spyOn(navigator, 'language', 'get').mockReturnValue('es-ES');
    const fresh = buildService();
    httpMock.match('/assets/i18n/es.json').forEach((c) => c.flush({}));
    httpMock.match('/assets/i18n/en.json').forEach((c) => c.flush({}));
    await tick();
    expect(fresh.language()).toBe('es');
  });

  it('falls back to es when navigator.language is not in the supported list', async () => {
    jest.spyOn(navigator, 'language', 'get').mockReturnValue('fr-FR');
    const fresh = buildService();
    httpMock.match('/assets/i18n/es.json').forEach((c) => c.flush({}));
    httpMock.match('/assets/i18n/en.json').forEach((c) => c.flush({}));
    await tick();
    expect(fresh.language()).toBe('es');
  });
});
