import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TextModeComponent } from './text-mode.component';

describe('PromptModeComponent', () => {
  let component: TextModeComponent;
  let fixture: ComponentFixture<TextModeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TextModeComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TextModeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
