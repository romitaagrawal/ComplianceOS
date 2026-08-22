import { Component, Input, OnChanges, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kpi-card.html',
  styleUrl: './kpi-card.css'
})
export class KpiCard implements OnChanges, OnDestroy {
  @Input() icon = 'insights';
  @Input() label = '';
  @Input() value = 0;
  @Input() suffix = '';
  @Input() color: 'primary' | 'success' | 'warning' | 'danger' | 'info' = 'primary';
  @Input() trendValue: number | null = null;
  @Input() trendLabel = '';

  displayValue = 0;
  private animFrame: number | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(): void {
    this.animateTo(this.value || 0);
  }

  ngOnDestroy(): void {
    if (this.animFrame !== null) cancelAnimationFrame(this.animFrame);
  }

  private animateTo(target: number): void {
    if (this.animFrame !== null) cancelAnimationFrame(this.animFrame);

    // Guard against the case where the animation loop never gets a chance
    // to paint (see note above) — this guarantees the correct number is
    // shown immediately, even before the first animation frame runs.
    if (this.displayValue === 0 && target !== 0) {
      // fall through to animate from 0 -> target below
    }

    const start = this.displayValue;
    const duration = 550;
    const startTime = performance.now();

    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      this.displayValue = Math.round(start + (target - start) * progress);

      // Explicitly force a repaint every frame — do not rely on ambient
      // zone-triggered change detection, which this project cannot
      // guarantee will fire after a requestAnimationFrame callback.
      this.cdr.detectChanges();

      if (progress < 1) {
        this.animFrame = requestAnimationFrame(step);
      } else {
        this.displayValue = target;
        this.cdr.detectChanges();
        this.animFrame = null;
      }
    };
    this.animFrame = requestAnimationFrame(step);
  }

  get trendDirection(): 'up' | 'down' | 'flat' {
    if (this.trendValue === null || this.trendValue === 0) return 'flat';
    return this.trendValue > 0 ? 'up' : 'down';
  }

  get trendIcon(): string {
    if (this.trendDirection === 'up') return 'trending_up';
    if (this.trendDirection === 'down') return 'trending_down';
    return 'trending_flat';
  }
}