import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RateLimitBanner } from './shared/rate-limit-banner/rate-limit-banner';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RateLimitBanner],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('compliance-ui');
}