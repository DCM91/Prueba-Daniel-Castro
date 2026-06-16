import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';

import { roleGuard } from './role.guard';
import { AuthService } from '../services/auth.service';
import { Role } from '../types/auth.types';

describe('roleGuard', () => {
  const runGuard = (allowed: readonly Role[], isAuth: boolean, currentRole: Role | null): boolean | UrlTree => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => isAuth,
            hasAnyRole: (roles: readonly Role[]) => currentRole !== null && roles.includes(currentRole),
          },
        },
        {
          provide: Router,
          useValue: { createUrlTree: jest.fn((commands: unknown[]) => ({ commands } as unknown as UrlTree)) },
        },
      ],
    });

    const guard = roleGuard(allowed);
    return TestBed.runInInjectionContext(() =>
      guard({} as never, {} as never)
    ) as boolean | UrlTree;
  };

  it('returns true when user has an allowed role', () => {
    expect(runGuard(['freelancer'], true, 'freelancer')).toBe(true);
  });

  it('returns true when user role is in a multi-role allow list', () => {
    expect(runGuard(['client', 'agency', 'company', 'admin'], true, 'admin')).toBe(true);
  });

  it('redirects to /login when not authenticated', () => {
    const tree = runGuard(['freelancer'], false, null) as unknown as { commands: unknown[] };
    expect(tree.commands).toEqual(['/login']);
  });

  it('redirects to /home (not /dashboard) when authenticated but role is not allowed', () => {
    const tree = runGuard(['freelancer'], true, 'client') as unknown as { commands: unknown[] };
    expect(tree.commands).toEqual(['/home']);
  });
});
