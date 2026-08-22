import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="skeleton-block" [style.height.px]="height" [style.width]="width" [style.borderRadius.px]="radius"></div>`
})
export class Skeleton {
  @Input() height = 16;
  @Input() width: string = '100%';
  @Input() radius = 6;
}