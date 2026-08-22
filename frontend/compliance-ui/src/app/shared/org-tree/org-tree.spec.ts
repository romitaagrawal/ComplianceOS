import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrgTree } from './org-tree';

describe('OrgTree', () => {
  let component: OrgTree;
  let fixture: ComponentFixture<OrgTree>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrgTree],
    }).compileComponents();

    fixture = TestBed.createComponent(OrgTree);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
