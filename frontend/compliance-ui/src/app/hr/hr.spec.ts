import { TestBed } from '@angular/core/testing';

import { Hr } from './hr';

describe('Hr', () => {
  let service: Hr;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Hr);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
