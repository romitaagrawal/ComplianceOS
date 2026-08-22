import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ChartSlice {
  label: string;
  value: number;
  color: string;
}

@Component({
  selector: 'app-donut-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './donut-chart.html',
  styleUrl: './donut-chart.css'
})
export class DonutChart {
  @Input() data: ChartSlice[] = [];
  @Input() size = 150;
  @Input() thickness = 20;
  @Input() centerLabel = 'Total';

  get total(): number {
    return this.data.reduce((sum, d) => sum + d.value, 0);
  }

  get radius(): number {
    return (this.size - this.thickness) / 2;
  }

  get circumference(): number {
    return 2 * Math.PI * this.radius;
  }

  get center(): number {
    return this.size / 2;
  }

  segments(): { color: string; dash: string; offset: number }[] {
    const denom = this.total || 1;
    let cumulative = 0;
    return this.data.map((d) => {
      const fraction = d.value / denom;
      const dashLength = fraction * this.circumference;
      const seg = {
        color: d.color,
        dash: `${dashLength} ${this.circumference - dashLength}`,
        offset: -cumulative
      };
      cumulative += dashLength;
      return seg;
    });
  }
}