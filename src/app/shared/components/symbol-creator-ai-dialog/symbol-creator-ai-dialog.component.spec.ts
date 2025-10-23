import {ComponentFixture, TestBed} from '@angular/core/testing';

import {SymbolCreatorAIDialogComponent} from './symbol-creator-ai-dialog.component';

describe('SymbolCreatorAIDialogComponent', () => {
  let component: SymbolCreatorAIDialogComponent;
  let fixture: ComponentFixture<SymbolCreatorAIDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SymbolCreatorAIDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SymbolCreatorAIDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
