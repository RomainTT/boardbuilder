import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageModeComponent } from './image-mode.component';

describe('ImageModeComponent', () => {
  let component: ImageModeComponent;
  let fixture: ComponentFixture<ImageModeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ImageModeComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ImageModeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
