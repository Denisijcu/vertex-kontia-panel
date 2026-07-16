
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Protege las rutas /admin/*. Requiere estar logueado Y tener
 * is_platform_admin=true en el SessionUser. Si no cumple, redirige
 * a /dashboard en silencio (no es un 403 dramatico -- simplemente no
 * existe esa opcion para este usuario).
 */
export const platformAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn() && auth.isPlatformAdmin()) {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};