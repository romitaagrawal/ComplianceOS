import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProgressRing } from './progress-ring';

describe('ProgressRing', () => {
  let component: ProgressRing;
  let fixture: ComponentFixture<ProgressRing>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgressRing],
    }).compileComponents();

    fixture = TestBed.createComponent(ProgressRing);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
