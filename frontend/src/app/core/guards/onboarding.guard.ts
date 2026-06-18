import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Para rutas /onboarding/** (excepto /onboarding/welcome y /onboarding/done).
 * Redirige al home si el user ya completó el onboarding.
 */
export const onboardingAccessGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.currentUser();

  if (user === null) {
    void router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  if (user.role !== 'freelancer') {
    void router.navigate(['/home']);
    return false;
  }

  if (user.freelancer_profile?.onboarding_completed_at != null) {
    void router.navigate(['/home/freelancer']);
    return false;
  }

  return true;
};

/**
 * Para rutas que no son onboarding. Redirige al wizard si el freelancer
 * no ha completado el onboarding aún.
 *
 * Por ahora solo lo aplicamos al home freelancer; no se aplica al
 * client home ni a landings, porque un freelancer puede aterrizar
 * en esas páginas y el wizard debe ser una entrada, no un bloqueo.
 */
export const onboardingRequiredGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.currentUser();

  if (user === null || user.role !== 'freelancer') {
    return true;
  }

  if (user.freelancer_profile?.onboarding_completed_at == null) {
    void router.navigate(['/onboarding/welcome']);
    return false;
  }

  return true;
};
