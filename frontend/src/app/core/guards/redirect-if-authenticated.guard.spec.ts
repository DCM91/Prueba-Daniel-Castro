import { TestBed } from '@angular/core/testing';
import { Router, type ActivatedRouteSnapshot, type RouterStateSnapshot } from '@angular/router';

import { redirectIfAuthenticatedGuard } from './redirect-if-authenticated.guard';
import { AuthService } from '../services/auth.service';
import { Role } from '../types/auth.types';

describe('redirectIfAuthenticatedGuard', () => {
  const runGuard = (isAuth: boolean, role: Role | null = null): unknown => {
    const createUrlTree = jest.fn((commands: unknown[]) => ({ commands } as object));
    const navigate = jest.fn();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => isAuth,
            role: () => role,
            homePathFor: (r: Role) => `/home/${r === 'freelancer' ? 'freelancer' : 'client'}`,
          },
        },
        { provide: Router, useValue: { createUrlTree, navigate } },
      ],
    });

    return TestBed.runInInjectionContext(() =>
      redirectIfAuthenticatedGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );
  };

  it('allows navigation when not authenticated', () => {
    expect(runGuard(false)).toBe(true);
  });

  it('redirects to /home/freelancer for authenticated freelancer', () => {
    const tree = runGuard(true, 'freelancer') as { commands: unknown[] };
    expect(tree.commands).toEqual(['/home/freelancer']);
  });

  it('redirects to /home/client for authenticated client', () => {
    const tree = runGuard(true, 'client') as { commands: unknown[] };
    expect(tree.commands).toEqual(['/home/client']);
  });

  it('redirects to /home when authenticated but role is null', () => {
    const tree = runGuard(true, null) as { commands: unknown[] };
    expect(tree.commands).toEqual(['/home']);
  });
});
