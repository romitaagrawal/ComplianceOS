import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth';

// Keep this mapping in one place — login.ts uses the same rule after login.
function dashboardPathForRole(role: string | null): string {
  switch (role) {
    case 'Employee': return '/employee-dashboard';
    case 'Manager': return '/manager-dashboard';
    case 'HREmployee':
    case 'HRManager': return '/hr-dashboard';
    default: return '/login';
  }
}

// Checks only "is this user logged in at all". Kept for routes that any
// authenticated user (regardless of role) is allowed to reach.
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  authService.logout();
  router.navigate(['/login']);
  return false;
};

// Checks "is this user logged in AND does their role appear in the allowed list".
// Use this on any route that is meant for specific roles only
// (e.g. /manager-dashboard, /hr-dashboard) so that an Employee typing the
// URL directly can't land on a screen whose API calls will all 403 anyway.
export function roleGuard(allowedRoles: string[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isLoggedIn()) {
      authService.logout();
      router.navigate(['/login']);
      return false;
    }

    const role = authService.getRole();
    if (role && allowedRoles.includes(role)) {
      return true;
    }

    // Logged in, but wrong role for this route — send them to the
    // dashboard they're actually allowed to see instead of a blank page.
    router.navigate([dashboardPathForRole(role)]);
    return false;
  };
}