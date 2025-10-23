import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SymbolCreatorAiComponent } from './symbol-creator-ai.component';

describe('SymbolCreatorAiComponent', () => {
  let component: SymbolCreatorAiComponent;
  let fixture: ComponentFixture<SymbolCreatorAiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SymbolCreatorAiComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SymbolCreatorAiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
