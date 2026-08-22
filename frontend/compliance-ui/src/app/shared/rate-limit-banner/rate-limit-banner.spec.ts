import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RateLimitBanner } from './rate-limit-banner';

describe('RateLimitBanner', () => {
  let component: RateLimitBanner;
  let fixture: ComponentFixture<RateLimitBanner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RateLimitBanner],
    }).compileComponents();

    fixture = TestBed.createComponent(RateLimitBanner);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
