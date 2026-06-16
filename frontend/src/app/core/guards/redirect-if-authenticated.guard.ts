import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

export const redirectIfAuthenticatedGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return true;
  }

  const role = auth.role();
  if (role) {
    return router.createUrlTree([auth.homePathFor(role)]);
  }
  return router.createUrlTree(['/home']);
};
