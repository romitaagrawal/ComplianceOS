import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bar-chart.html',
  styleUrl: './bar-chart.css'
})
export class BarChart {
  @Input() data: BarDatum[] = [];
  @Input() height = 180;

  get maxValue(): number {
    return Math.max(...this.data.map((d) => d.value), 1);
  }

  heightPercent(value: number): number {
    return Math.max((value / this.maxValue) * 100, value > 0 ? 4 : 0);
  }
}