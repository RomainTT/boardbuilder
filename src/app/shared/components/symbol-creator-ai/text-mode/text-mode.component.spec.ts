import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PromptModeComponent } from './prompt-mode.component';

describe('PromptModeComponent', () => {
  let component: PromptModeComponent;
  let fixture: ComponentFixture<PromptModeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PromptModeComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PromptModeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
