import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-progress-ring',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './progress-ring.html',
  styleUrl: './progress-ring.css'
})
export class ProgressRing {
  @Input() percent = 0;
  @Input() size = 120;
  @Input() thickness = 12;
  @Input() color = '#3050e0';
  @Input() label = '';

  get radius(): number {
    return (this.size - this.thickness) / 2;
  }

  get circumference(): number {
    return 2 * Math.PI * this.radius;
  }

  get center(): number {
    return this.size / 2;
  }

  get clampedPercent(): number {
    return Math.min(Math.max(this.percent, 0), 100);
  }

  get offset(): number {
    return this.circumference - (this.clampedPercent / 100) * this.circumference;
  }
}