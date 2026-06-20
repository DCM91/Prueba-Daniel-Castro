import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Rutas a las que un freelancer SIN onboarding completo puede acceder.
 * - `/home` y sub-rutas: landing de su rol (con CTA de "Completar perfil" si procede).
 * - `/onboarding*`: el propio wizard.
 * - `/freelancer/portfolio`: la galería de portfolio es un sub-recurso independiente
 *   del resto del onboarding; el propio wizard (step 5) linka a esta página con
 *   `target="_blank"`, y el `ProfileEditorComponent` también. Mantenerlo accesible
 *   incluso sin completar el resto del onboarding.
 */
const BYPASS_PREFIXES: readonly string[] = ['/home', '/onboarding', '/freelancer/portfolio'];

/**
 * Asegura que un freelancer haya completado el wizard de onboarding antes de
 * acceder a la mayoría de las rutas autenticadas.
 *
 * Comportamiento:
 * - Sin sesión → `true` (deja que `authGuard` haga su trabajo aguas arriba).
 * - User con `role !== 'freelancer'` → `true` (el onboarding solo aplica a freelancers).
 * - Freelancer con `onboarding_completed_at` definido → `true` (ya completó).
 * - Freelancer incompleto accediendo a `/home*`, `/onboarding*` o `/freelancer/portfolio*` → `true` (bypass).
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
