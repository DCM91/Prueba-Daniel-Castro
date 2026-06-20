import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Rutas a las que un freelancer SIN onboarding completo puede acceder.
 * - `/home` y sub-rutas: landing de su rol (con CTA de "Completar perfil" si procede).
 * - `/onboarding*`: el propio wizard.
 */
const BYPASS_PREFIXES: readonly string[] = ['/home', '/onboarding'];

/**
 * Asegura que un freelancer haya completado el wizard de onboarding antes de
 * acceder a la mayoría de las rutas autenticadas.
 *
 * Comportamiento:
 * - Sin sesión → `true` (deja que `authGuard` haga su trabajo aguas arriba).
 * - User con `role !== 'freelancer'` → `true` (el onboarding solo aplica a freelancers).
 * - Freelancer con `onboarding_completed_at` definido → `true` (ya completó).
 * - Freelancer incompleto accediendo a `/home*` o `/onboarding*` → `true` (bypass).
 * - Cualquier otro caso → `UrlTree('/onboarding/welcome')`.
 */
export const onboardingGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const user = auth.currentUser();
  if (user === null) return true;

  if (user.role !== 'freelancer') return true;

  if (user.freelancer_profile?.onboarding_completed_at != null) return true;

  const path = state.url.split('?')[0] ?? '';
  if (BYPASS_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + '/'))) {
    return true;
  }

  return router.createUrlTree(['/onboarding/welcome']);
};
