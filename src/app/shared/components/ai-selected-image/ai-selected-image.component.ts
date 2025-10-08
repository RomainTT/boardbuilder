import { Component, Input, Output, EventEmitter } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { RatingState } from '@data/services/ai-symbol-state.service';

export interface RatingChangeEvent {
  type: 'overall' | 'prompt' | 'style';
  value: number;
}

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
  @Input() ratingState: RatingState | null = null;
  @Input() removeBackgroundButtonText: string = 'Remove Background';
  @Input() isLoading: boolean = false;
  @Input() accessPoint?: 'media' | 'boardset';

  // Outputs for actions
  @Output() saveRequested = new EventEmitter<void>();
  @Output() removeBackgroundRequested = new EventEmitter<void>();
  @Output() downloadRequested = new EventEmitter<void>();
  @Output() importToDesignerRequested = new EventEmitter<void>();
  @Output() closeRequested = new EventEmitter<void>();

  // Output for rating changes
  @Output() ratingChanged = new EventEmitter<RatingChangeEvent>();

  // Rating methods that emit events to parent
  setRating(value: number): void {
    if (this.isValidRating(value)) {
      this.ratingChanged.emit({ type: 'overall', value });
    }
  }

  setPromptAccuracy(value: number): void {
    if (this.isValidRating(value)) {
      this.ratingChanged.emit({ type: 'prompt', value });
    }
  }

  setStyleAccuracy(value: number): void {
    if (this.isValidRating(value)) {
      this.ratingChanged.emit({ type: 'style', value });
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

  // Get save button text based on access point
  get saveButtonText(): string {
    return this.accessPoint === 'media' ? 'Save' : 'Save to cell';
  }

  // Internal action methods
  onSave(): void {
    this.saveRequested.emit();
  }

  onRemoveBackground(): void {
    this.removeBackgroundRequested.emit();
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