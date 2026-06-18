import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';

import { ProfileCompletionService } from './profile-completion.service';
import { AuthService } from './auth.service';
import { User } from '../types/auth.types';

describe('ProfileCompletionService', () => {
  let svc: ProfileCompletionService;
  let httpMock: HttpTestingController;
  let userSignal: ReturnType<typeof signal<User | null>>;

  const makeUser = (overrides: Partial<User> = {}): User => ({
    id: 42,
    name: 'Lucia',
    email: 'lucia@example.com',
    role: 'freelancer',
    created_at: null,
    ...overrides,
  });

  beforeEach(() => {
    userSignal = signal<User | null>(null);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { currentUser: userSignal } },
        ProfileCompletionService,
      ],
    });

    svc = TestBed.inject(ProfileCompletionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('does nothing when there is no current user', async () => {
    await svc.refresh();
    expect(svc.pct()).toBeNull();
    expect(svc.missing()).toBeNull();
  });

  it('returns 0/profile for non-freelancer roles without hitting the API', async () => {
    userSignal.set(makeUser({ role: 'client' }));
    await svc.refresh();
    expect(svc.pct()).toBe(0);
    expect(svc.missing()).toEqual(['profile']);
    httpMock.expectNone('/api/me/completion');
  });

  it('caches by user id: does not re-fetch on a second call for the same user', async () => {
    userSignal.set(makeUser());
    const p1 = svc.refresh();
    const req1 = httpMock.expectOne('/api/me/completion');
    req1.flush({ pct: 60, missing: ['avatar', 'cover', 'portfolio'] });
    await p1;

    const p2 = svc.refresh();
    await p2;
    httpMock.expectNone('/api/me/completion');
    expect(svc.pct()).toBe(60);
  });

  it('refetches when the current user changes', async () => {
    userSignal.set(makeUser({ id: 1 }));
    const p1 = svc.refresh();
    httpMock.expectOne('/api/me/completion').flush({ pct: 50, missing: ['skills'] });
    await p1;

    userSignal.set(makeUser({ id: 2 }));
    const p2 = svc.refresh();
    httpMock.expectOne('/api/me/completion').flush({ pct: 100, missing: [] });
    await p2;

    expect(svc.pct()).toBe(100);
  });

  it('refetches when force=true is passed even for the same user', async () => {
    userSignal.set(makeUser());
    const p1 = svc.refresh();
    httpMock.expectOne('/api/me/completion').flush({ pct: 50, missing: ['skills'] });
    await p1;

    const p2 = svc.refresh(true);
    httpMock.expectOne('/api/me/completion').flush({ pct: 75, missing: ['avatar'] });
    await p2;

    expect(svc.pct()).toBe(75);
  });

  it('clears state on reset()', async () => {
    userSignal.set(makeUser());
    const p = svc.refresh();
    httpMock.expectOne('/api/me/completion').flush({ pct: 100, missing: [] });
    await p;

    svc.reset();
    expect(svc.pct()).toBeNull();
    expect(svc.missing()).toBeNull();
  });

  it('clears state and sets null on HTTP error', async () => {
    userSignal.set(makeUser());
    const p = svc.refresh();
    httpMock.expectOne('/api/me/completion').flush(
      { message: 'Server error' },
      { status: 500, statusText: 'Internal Server Error' },
    );
    await p;

    expect(svc.pct()).toBeNull();
    expect(svc.missing()).toBeNull();
  });

  it('exposes isComplete=true when pct is 100', async () => {
    userSignal.set(makeUser());
    const p = svc.refresh();
    httpMock.expectOne('/api/me/completion').flush({ pct: 100, missing: [] });
    await p;

    expect(svc.isComplete()).toBe(true);
  });

  it('exposes isComplete=false when pct is below 100', async () => {
    userSignal.set(makeUser());
    const p = svc.refresh();
    httpMock.expectOne('/api/me/completion').flush({ pct: 75, missing: ['avatar'] });
    await p;

    expect(svc.isComplete()).toBe(false);
  });
});
