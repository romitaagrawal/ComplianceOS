import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface LinePoint {
  label: string;
  value: number;
}

@Component({
  selector: 'app-line-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './line-chart.html',
  styleUrl: './line-chart.css'
})
export class LineChart {
  @Input() data: LinePoint[] = [];
  @Input() width = 480;
  @Input() height = 160;
  @Input() color = '#3050e0';
  @Input() gradientId = 'lineChartGradient';

  get maxValue(): number {
    return Math.max(...this.data.map((d) => d.value), 1);
  }

  private stepX(): number {
    return this.width / Math.max(this.data.length - 1, 1);
  }

  private yFor(value: number): number {
    return this.height - (value / this.maxValue) * (this.height - 24) - 12;
  }

  get points(): string {
    if (this.data.length === 0) return '';
    return this.data.map((d, i) => `${i * this.stepX()},${this.yFor(d.value)}`).join(' ');
  }

  get areaPoints(): string {
    if (this.data.length === 0) return '';
    return `0,${this.height} ${this.points} ${this.width},${this.height}`;
  }

  dotCoords(): { x: number; y: number; label: string; value: number }[] {
    return this.data.map((d, i) => ({
      x: i * this.stepX(),
      y: this.yFor(d.value),
      label: d.label,
      value: d.value
    }));
  }
}