import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth';
import { RateLimitNoticeService } from '../core/rate-limit-notice';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const rateLimitNotice = inject(RateLimitNoticeService);

  const token = authService.getToken();
  const clonedRequest = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(clonedRequest).pipe(
    catchError((err) => {
      // The token expired or was rejected mid-session. Previously nothing
      // handled this — every subsequent call would silently keep failing
      // until the user manually refreshed the page. Now we log them out
      // and send them back to the login screen immediately.
      if (err.status === 401) {
        authService.logout();
        router.navigate(['/login']);
      }

      // The backend's rate limiter rejected this request. Handled here,
      // once, so every screen in the app gets the same clear message
      // instead of each component needing its own 429 handling.
      if (err.status === 429) {
        const retryAfterSeconds = Number(err.error?.retryAfterSeconds ?? err.headers?.get?.('Retry-After'));
        rateLimitNotice.show(
          err.error?.message || 'Too many requests. Please try again later.',
          Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined
        );
      }

      return throwError(() => err);
    })
  );
};