import { TestBed } from '@angular/core/testing';

import { Regularization } from './regularization';

describe('Regularization', () => {
  let service: Regularization;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Regularization);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
