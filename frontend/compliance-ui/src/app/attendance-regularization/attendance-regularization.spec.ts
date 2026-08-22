import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AttendanceRegularization } from './attendance-regularization';

describe('AttendanceRegularization', () => {
  let component: AttendanceRegularization;
  let fixture: ComponentFixture<AttendanceRegularization>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttendanceRegularization],
    }).compileComponents();

    fixture = TestBed.createComponent(AttendanceRegularization);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
