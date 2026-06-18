import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';

import { OnboardingService, ONBOARDING_STEPS } from './onboarding.service';
import { AuthService } from './auth.service';
import { User } from '../types/auth.types';

const STORAGE_KEY = 'framematch_onboarding_step';

describe('OnboardingService', () => {
  let svc: OnboardingService;
  let httpMock: HttpTestingController;
  let userSignal: ReturnType<typeof signal<User | null>>;

  const makeUser = (overrides: Partial<User> = {}): User => ({
    id: 1,
    name: 'Lucia',
    email: 'lucia@example.com',
    role: 'freelancer',
    created_at: null,
    ...overrides,
  });

  beforeEach(() => {
    localStorage.clear();
    userSignal = signal<User | null>(null);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { currentUser: userSignal } },
        OnboardingService,
      ],
    });
    svc = TestBed.inject(OnboardingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    localStorage.clear();
    httpMock.verify();
  });

  it('starts at welcome when storage is empty', () => {
    expect(svc.step()).toBe('welcome');
    expect(svc.stepIndex()).toBe(0);
    expect(svc.progressPct()).toBe(0);
  });

  it('restores step from localStorage on init', () => {
    localStorage.setItem(STORAGE_KEY, 'avatar');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { currentUser: userSignal } },
        OnboardingService,
      ],
    });
    const svc2 = TestBed.inject(OnboardingService);
    expect(svc2.step()).toBe('avatar');
    expect(svc2.progressPct()).toBeGreaterThan(0);
  });

  it('advances through steps in order via goNext', () => {
    svc.setStep('datos');
    svc.goNext();
    expect(svc.step()).toBe('avatar');
    svc.goNext();
    expect(svc.step()).toBe('bio-tarifa');
    svc.goNext();
    expect(svc.step()).toBe('skills');
  });

  it('goes back via goPrev but not past datos', () => {
    svc.setStep('skills');
    svc.goPrev();
    expect(svc.step()).toBe('bio-tarifa');
    svc.goPrev();
    svc.goPrev();
    svc.goPrev();
    expect(svc.step()).toBe('datos');
    svc.goPrev();
    expect(svc.step()).toBe('datos');
  });

  it('persists the current step in localStorage on setStep', () => {
    svc.setStep('skills');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('skills');
  });

  it('clears localStorage when reaching done', () => {
    svc.setStep('skills');
    localStorage.setItem(STORAGE_KEY, 'skills');
    svc.setStep('done');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('exposes isComplete=true when the user has onboarding_completed_at set', () => {
    userSignal.set(makeUser({
      freelancer_profile: {
        id: 1, user_id: 1, display_name: null, bio: null, city: null,
        hourly_rate: null, price_per_project: null, is_available: false,
        skills: [],
        onboarding_completed_at: '2026-06-18T10:00:00+00:00',
      },
    }));
    expect(svc.isComplete()).toBe(true);
  });

  it('exposes isComplete=false when the user has no onboarding_completed_at', () => {
    userSignal.set(makeUser({
      freelancer_profile: {
        id: 1, user_id: 1, display_name: null, bio: null, city: null,
        hourly_rate: null, price_per_project: null, is_available: true,
        skills: [],
      },
    }));
    expect(svc.isComplete()).toBe(false);
  });

  it('exposes isComplete=true for non-freelancer roles', () => {
    userSignal.set(makeUser({ role: 'client' }));
    expect(svc.isComplete()).toBe(true);
  });

  it('skip() only advances from cover-portfolio to done', () => {
    svc.setStep('skills');
    svc.skip();
    expect(svc.step()).toBe('skills');
    svc.setStep('cover-portfolio');
    svc.skip();
    expect(svc.step()).toBe('done');
  });

  it('complete() POSTs to the endpoint, sets step to done, and clears storage', async () => {
    userSignal.set(makeUser());
    const p = svc.complete();
    const req = httpMock.expectOne('/api/me/onboarding-complete');
    expect(req.request.method).toBe('POST');
    req.flush({ data: { onboarding_completed_at: '2026-06-18T10:00:00+00:00' } });

    const ok = await p;
    expect(ok).toBe(true);
    expect(svc.step()).toBe('done');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('complete() returns false and sets error on HTTP failure', async () => {
    userSignal.set(makeUser());
    const p = svc.complete();
    httpMock.expectOne('/api/me/onboarding-complete').flush(
      { message: 'Forbidden' },
      { status: 403, statusText: 'Forbidden' },
    );

    const ok = await p;
    expect(ok).toBe(false);
    expect(svc.error()).toBe('Forbidden');
  });

  it('reset() returns to welcome and clears storage', () => {
    svc.setStep('avatar');
    svc.reset();
    expect(svc.step()).toBe('welcome');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('exports ONBOARDING_STEPS as a constant tuple', () => {
    expect(ONBOARDING_STEPS).toEqual([
      'welcome', 'datos', 'avatar', 'bio-tarifa', 'skills', 'cover-portfolio', 'done',
    ]);
  });
});
