import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, type ActivatedRouteSnapshot, type RouterStateSnapshot } from '@angular/router';

import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  const makeRoute = (): ActivatedRouteSnapshot => ({ url: [] } as unknown as ActivatedRouteSnapshot);
  const makeState = (url: string): RouterStateSnapshot => ({ url } as unknown as RouterStateSnapshot);

  const runGuard = (stateUrl: string, isAuth: boolean): boolean | UrlTree => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: { isAuthenticated: () => isAuth },
        },
        {
          provide: Router,
          useValue: { createUrlTree: jest.fn((commands: unknown[], extras?: { queryParams?: Record<string, string> }) => ({ commands, extras } as unknown as UrlTree)) },
        },
      ],
    });

    return TestBed.runInInjectionContext(() => authGuard(makeRoute(), makeState(stateUrl))) as boolean | UrlTree;
  };

  it('returns true when user is authenticated', () => {
    expect(runGuard('/dashboard', true)).toBe(true);
  });

  it('redirects to /login with returnUrl when not authenticated', () => {
    const tree = runGuard('/dashboard', false) as unknown as { commands: unknown[]; extras: { queryParams: Record<string, string> } };
    expect(tree.commands).toEqual(['/login']);
    expect(tree.extras.queryParams.returnUrl).toBe('/dashboard');
  });
});
