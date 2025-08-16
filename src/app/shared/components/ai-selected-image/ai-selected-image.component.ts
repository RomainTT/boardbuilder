import { Component, Input, Output, EventEmitter } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-ai-selected-image',
  templateUrl: './ai-selected-image.component.html',
  styleUrls: ['./ai-selected-image.component.scss'],
  animations: [
    trigger('expandSelected', [
      transition(':enter', [
        style({ maxHeight: '0px', overflow: 'hidden' }),
        animate('800ms cubic-bezier(0.4, 0.0, 0.2, 1)', style({ maxHeight: '600px', overflow: 'visible' })),
      ]),
    ]),
  ]
})
export class AiSelectedImageComponent {
  @Input() selectedImageIndex: number | null = null;
  @Input() selectedImageUrl: string = '';

  // Internal rating state
  rating: number = 0;
  promptAccuracy: number = 0;
  styleAccuracy: number = 0;
  showDetailedRatings: boolean = false;

  // Simplified outputs - only the essential actions
  @Output() saveRequested = new EventEmitter<void>();
  @Output() downloadRequested = new EventEmitter<void>();
  @Output() importToDesignerRequested = new EventEmitter<void>();
  @Output() closeRequested = new EventEmitter<void>();

  // Internal rating methods
  setRating(value: number) {
    this.rating = value;
    console.log(`Overall rated ${value} stars for image index: ${this.selectedImageIndex}`);
    if (value > 0) {
      this.showDetailedRatings = true;
    }
  }

  setPromptAccuracy(value: number) {
    this.promptAccuracy = value;
    console.log(`Prompt Accuracy rated ${value} stars for image index: ${this.selectedImageIndex}`);
  }

  setStyleAccuracy(value: number) {
    this.styleAccuracy = value;
    console.log(`Style Accuracy rated ${value} stars for image index: ${this.selectedImageIndex}`);
  }

  // Internal action methods
  onSave() {
    this.saveRequested.emit();
  }

  onDownload() {
    this.downloadRequested.emit();
  }

  onImportToDesigner() {
    this.importToDesignerRequested.emit();
  }

  onClose() {
    this.closeRequested.emit();
  }
}