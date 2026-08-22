import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AttendanceLog } from '../../../attendance/attendance';

export interface WeeklyDayBar {
  label: string;
  dateLabel: string;
  dateIso: string;
  target: number;
  worked: number;
  overtime: number;
  isToday: boolean;
}

@Component({
  selector: 'app-weekly-hours-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './weekly-hours-chart.html',
  styleUrl: './weekly-hours-chart.css'
})
export class WeeklyHoursChart {
  @Input() logs: AttendanceLog[] = [];
  @Input() targetHours = 9;
  @Input() height = 220;

  @Output() regularize = new EventEmitter<string>();

  weekOffset = 0;
  isNavigating = false;
  selectedDateIso: string | null = null;

  get days(): WeeklyDayBar[] {
    return this.buildWeek();
  }

  get weekRangeLabel(): string {
    const days = this.buildWeek();
    if (days.length === 0) return '';
    const first = days[0].dateLabel;
    const last = days[days.length - 1].dateLabel;
    const year = this.getWeekStart().getFullYear();
    return `${first} – ${last} ${year}`;
  }

  private getWeekStart(): Date {
    const today = new Date();
    today.setDate(today.getDate() + this.weekOffset * 7);
    const day = today.getDay(); // 0 = Sunday
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  private toIsoDate(d: Date): string {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private buildWeek(): WeeklyDayBar[] {
    const monday = this.getWeekStart();
    const todayIso = this.toIsoDate(new Date());
    const result: WeeklyDayBar[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateIso = this.toIsoDate(date);

      const log = this.logs.find((l) => this.toIsoDate(new Date(l.clockIn)) === dateIso);
      const rawHours = log?.totalHours ?? 0;
      const worked = Math.min(rawHours, this.targetHours);
      const overtime = Math.max(rawHours - this.targetHours, 0);

      result.push({
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dateLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        dateIso,
        target: this.targetHours,
        worked: Math.round(worked * 10) / 10,
        overtime: Math.round(overtime * 10) / 10,
        isToday: dateIso === todayIso
      });
    }

    return result;
  }

  private get maxScale(): number {
    const days = this.buildWeek();
    const highest = Math.max(this.targetHours, ...days.map((d) => d.worked + d.overtime));
    return highest * 1.05;
  }

  targetHeightPercent(day: WeeklyDayBar): number {
    return (day.target / this.maxScale) * 100;
  }

  workedHeightPercent(day: WeeklyDayBar): number {
    return (day.worked / this.maxScale) * 100;
  }

  overtimeHeightPercent(day: WeeklyDayBar): number {
    return (day.overtime / this.maxScale) * 100;
  }

  totalLabel(day: WeeklyDayBar): string {
    const totalHoursDecimal = day.worked + day.overtime;
    if (totalHoursDecimal <= 0) return '—';
    const totalMinutes = Math.round(totalHoursDecimal * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  }

  tooltipFor(day: WeeklyDayBar): string {
    const total = day.worked + day.overtime;
    if (total === 0) return `${day.label} ${day.dateLabel}: no attendance`;
    return `${day.label} ${day.dateLabel}: ${this.totalLabel(day)} worked${day.overtime > 0 ? ` (incl. ${day.overtime}h overtime)` : ''}`;
  }

  goPrevWeek(): void {
    this.weekOffset -= 1;
    this.flash();
  }

  goNextWeek(): void {
    this.weekOffset += 1;
    this.flash();
  }

  goToThisWeek(): void {
    this.weekOffset = 0;
    this.flash();
  }

  private flash(): void {
    this.isNavigating = true;
    setTimeout(() => (this.isNavigating = false), 150);
  }

  selectDay(day: WeeklyDayBar): void {
    this.selectedDateIso = day.dateIso;
  }

  onRegularizeClick(): void {
    if (this.selectedDateIso) {
      this.regularize.emit(this.selectedDateIso);
    }
  }
}