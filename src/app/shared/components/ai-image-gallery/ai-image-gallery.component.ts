import { Component, Input, Output, EventEmitter } from '@angular/core';
import { trigger, transition, style, animate, AnimationEvent } from '@angular/animations';

@Component({
  selector: 'app-ai-image-gallery',
  templateUrl: './ai-image-gallery.component.html',
  styleUrls: ['./ai-image-gallery.component.scss'],
  animations: [
    trigger('expand', [
      transition(':enter', [
        style({ height: '0px', overflow: 'hidden' }),
        animate('800ms cubic-bezier(0.4, 0.0, 0.2, 1)', style({ height: '170px', overflow: 'visible' })),
      ]),
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('600ms ease-in', style({ opacity: 1 })),
      ]),
    ]),
  ]
})
export class AiImageGalleryComponent {
  @Input() generatedImages: string[] = [];
  @Input() selectedImageIndex: number | null = null;
  @Input() isGenerated: boolean = false;
  @Input() showImages: boolean = false;
  @Input() isLoading: boolean = false;
  @Input() isRefreshing: boolean = false;
  @Input() apiError: string | null = null;
  @Input() showApiError: boolean = false;

  @Output() imageSelected = new EventEmitter<number>();
  @Output() expandDone = new EventEmitter<AnimationEvent>();
  @Output() retryRequested = new EventEmitter<void>();

  selectImage(index: number) {
    this.imageSelected.emit(index);
  }

  onExpandDone(event: AnimationEvent) {
    this.expandDone.emit(event);
  }

  onRetry() {
    this.retryRequested.emit();
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }
}