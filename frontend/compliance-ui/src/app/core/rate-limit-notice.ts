import { Injectable, signal } from '@angular/core';

// Tiny app-wide signal the auth interceptor writes into whenever the backend
// returns 429, and <app-rate-limit-banner> (mounted once, at the app root)
// reads from. Kept separate from AuthService since this has nothing to do
// with who's logged in -- a 429 can happen on the login page too.
@Injectable({ providedIn: 'root' })
export class RateLimitNoticeService {
  readonly message = signal<string | null>(null);

  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  show(message: string, retryAfterSeconds?: number): void {
    this.message.set(message);

    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }

    // Auto-dismiss using the server's Retry-After hint when we have one
    // (capped so a very long lockout doesn't pin the banner on screen
    // indefinitely); otherwise fall back to a short default.
    const displaySeconds = retryAfterSeconds && retryAfterSeconds > 0
      ? Math.min(retryAfterSeconds, 30)
      : 8;

    this.hideTimer = setTimeout(() => this.dismiss(), displaySeconds * 1000);
  }

  dismiss(): void {
    this.message.set(null);
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
}