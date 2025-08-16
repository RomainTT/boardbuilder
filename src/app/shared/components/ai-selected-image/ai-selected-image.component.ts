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
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('300ms ease-in-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
    trigger('fadeInDetailed', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-50%) translateX(20px)' }),
        animate('400ms ease-in-out', style({ opacity: 1, transform: 'translateY(-50%) translateX(0)' })),
      ]),
    ]),
  ]
})
export class AiSelectedImageComponent {
  @Input() selectedImageIndex: number | null = null;
  @Input() selectedImageUrl: string = '';

  // Internal rating state with proper typing
  rating: number = 0;
  promptAccuracy: number = 0;
  styleAccuracy: number = 0;
  showDetailedRatings: boolean = false;

  // Simplified outputs - only the essential actions
  @Output() saveRequested = new EventEmitter<void>();
  @Output() downloadRequested = new EventEmitter<void>();
  @Output() importToDesignerRequested = new EventEmitter<void>();
  @Output() closeRequested = new EventEmitter<void>();

  // Internal rating methods with validation
  setRating(value: number): void {
    if (this.isValidRating(value)) {
      this.rating = value;
      console.log(`Overall rated ${value} stars for image index: ${this.selectedImageIndex}`);
      if (value > 0) {
        this.showDetailedRatings = true;
      }
    }
  }

  setPromptAccuracy(value: number): void {
    if (this.isValidRating(value)) {
      this.promptAccuracy = value;
      console.log(`Prompt Accuracy rated ${value} stars for image index: ${this.selectedImageIndex}`);
    }
  }

  setStyleAccuracy(value: number): void {
    if (this.isValidRating(value)) {
      this.styleAccuracy = value;
      console.log(`Style Accuracy rated ${value} stars for image index: ${this.selectedImageIndex}`);
    }
  }

  // Helper method for rating validation
  private isValidRating(value: number): boolean {
    return Number.isInteger(value) && value >= 1 && value <= 5;
  }

  // Helper method to check if image URL is valid
  get hasValidImageUrl(): boolean {
    return !!this.selectedImageUrl && this.selectedImageUrl.trim().length > 0;
  }

  // Internal action methods
  onSave(): void {
    this.saveRequested.emit();
  }

  onDownload(): void {
    this.downloadRequested.emit();
  }

  onImportToDesigner(): void {
    this.importToDesignerRequested.emit();
  }

  onClose(): void {
    this.closeRequested.emit();
  }
}