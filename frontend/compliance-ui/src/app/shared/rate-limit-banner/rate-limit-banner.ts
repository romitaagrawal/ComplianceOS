import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RateLimitNoticeService } from '../../core/rate-limit-notice';

// Mounted once at the app root (see app.html) so a 429 shows the same clear
// banner no matter which screen -- or the login page -- the person is on.
@Component({
  selector: 'app-rate-limit-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rate-limit-banner.html',
  styleUrl: './rate-limit-banner.css'
})
export class RateLimitBanner {
  constructor(public notice: RateLimitNoticeService) {}

  dismiss(): void {
    this.notice.dismiss();
  }
}