import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WeeklyHoursChart } from './weekly-hours-chart';

describe('WeeklyHoursChart', () => {
  let component: WeeklyHoursChart;
  let fixture: ComponentFixture<WeeklyHoursChart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WeeklyHoursChart],
    }).compileComponents();

    fixture = TestBed.createComponent(WeeklyHoursChart);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
