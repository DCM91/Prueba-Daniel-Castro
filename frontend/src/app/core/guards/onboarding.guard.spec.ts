import { TestBed } from '@angular/core/testing';
import { Router, type ActivatedRouteSnapshot, type RouterStateSnapshot } from '@angular/router';

import { onboardingGuard } from './onboarding.guard';
import { AuthService } from '../services/auth.service';
import { User } from '../types/auth.types';

describe('onboardingGuard', () => {
  const makeRoute = (): ActivatedRouteSnapshot => ({ url: [] } as unknown as ActivatedRouteSnapshot);
  const makeState = (url: string): RouterStateSnapshot => ({ url } as unknown as RouterStateSnapshot);

  const runGuard = (user: User | null, stateUrl: string): unknown => {
    const createUrlTree = jest.fn((commands: unknown[]) => ({ commands } as object));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { currentUser: () => user } },
        { provide: Router, useValue: { createUrlTree } },
      ],
    });

    return TestBed.runInInjectionContext(() => onboardingGuard(makeRoute(), makeState(stateUrl)));
  };

  const clientUser: User = { id: 1, name: 'Lucia', email: 'l@e.com', role: 'client', created_at: null };

  const incompleteFreelancer: User = {
    id: 2,
    name: 'Diego',
    email: 'd@e.com',
    role: 'freelancer',
    created_at: null,
    freelancer_profile: {
      id: 1,
      display_name: null,
      bio: null,
      city: null,
      hourly_rate: null,
      price_per_project: null,
      is_available: false,
      avatar_url: null,
      cover_url: null,
      onboarding_completed_at: null,
    },
  };

  const completeFreelancer: User = {
    ...incompleteFreelancer,
    freelancer_profile: { ...incompleteFreelancer.freelancer_profile!, onboarding_completed_at: '2026-06-15T10:00:00Z' },
  };

  it('allows navigation when there is no authenticated user (defer to authGuard)', () => {
    expect(runGuard(null, '/briefs')).toBe(true);
  });

  it('allows navigation for non-freelancer roles (only freelancers need onboarding)', () => {
    expect(runGuard(clientUser, '/briefs')).toBe(true);
  });

  it('allows navigation for a freelancer who has completed onboarding', () => {
    expect(runGuard(completeFreelancer, '/briefs')).toBe(true);
  });

  it.each([
    '/home',
    '/home/freelancer',
    '/home/client',
    '/onboarding',
    '/onboarding/welcome',
    '/freelancer/portfolio',
    '/freelancer/portfolio/123',
  ])('bypasses the guard for the onboarding/home/portfolio paths (%s)', (path) => {
    expect(runGuard(incompleteFreelancer, path)).toBe(true);
  });

  it.each([
    '/briefs/new',
    '/briefs/1',
    '/messages',
    '/account',
    '/freelancer/profile/edit',
  ])('redirects an incomplete freelancer to /onboarding/welcome when visiting %s', (path) => {
    const tree = runGuard(incompleteFreelancer, path) as { commands: unknown[] };
    expect(tree.commands).toEqual(['/onboarding/welcome']);
  });

  it('strips query params before checking the bypass list', () => {
    expect(runGuard(incompleteFreelancer, '/home?foo=bar')).toBe(true);
    expect(runGuard(incompleteFreelancer, '/onboarding/welcome?from=login')).toBe(true);
  });

  it('still redirects when the protected path has query params', () => {
    const tree = runGuard(incompleteFreelancer, '/messages?brief=42') as { commands: unknown[] };
    expect(tree.commands).toEqual(['/onboarding/welcome']);
  });

  it('treats a freelancer without freelancer_profile as incomplete', () => {
    const withoutProfile: User = { ...incompleteFreelancer, freelancer_profile: null };
    const tree = runGuard(withoutProfile, '/account') as { commands: unknown[] };
    expect(tree.commands).toEqual(['/onboarding/welcome']);
  });
});
