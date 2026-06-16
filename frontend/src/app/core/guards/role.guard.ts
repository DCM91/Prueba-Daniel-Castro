import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { Role } from '../types/auth.types';

export const roleGuard = (allowed: readonly Role[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }

    if (auth.hasAnyRole(allowed)) {
      return true;
    }

    return router.createUrlTree(['/home']);
  };
};
