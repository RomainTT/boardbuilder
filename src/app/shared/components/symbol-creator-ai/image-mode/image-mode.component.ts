import { Component, Input, OnInit } from '@angular/core';
import { of, Observable } from 'rxjs';
import { delay } from 'rxjs/operators';
import { trigger, transition, style, animate, AnimationEvent } from '@angular/animations';
import { ImageUploadResult } from '../../image-upload-dialog/image-upload-dialog.component';
import { BaseSymbolCreatorComponent } from '../base-symbol-creator.component';

@Component({
  selector: 'app-image-mode',
  templateUrl: './image-mode.component.html',
  styleUrls: ['./image-mode.component.scss'],
  animations: [
    trigger('expandSelected', [
      transition(':enter', [
        style({ maxHeight: '0px', overflow: 'hidden' }),
        animate('800ms cubic-bezier(0.4, 0.0, 0.2, 1)', style({ maxHeight: '600px', overflow: 'visible' })),
      ]),
    ]),
  ]
})
export class ImageModeComponent extends BaseSymbolCreatorComponent implements OnInit {

  @Input() uploadedImageData: ImageUploadResult | null = null;

  ngOnInit() {
    // Initialize styles using base class method
    this.initializeStyles();
    
    // Auto-generate variations when component loads with uploaded image
    if (this.uploadedImageData) {
      this.generateImageVariations();
    }
  }

  // Stubbed image-to-image generation method
  generateImageVariations() {
    if (!this.uploadedImageData) {
      console.warn('[ImageModeComponent] No uploaded image data available');
      return;
    }

    console.log(`[ImageModeComponent] POST ${this.uploadedImageData.base64.substring(0, 50)}... to /api/symbols/image-to-image`);
    console.log(`[ImageModeComponent] Style: ${this.selectedStyle}, Culture: ${this.additionalText}, Background: ${this.backgroundEnabled}, Outlines: ${this.outlinesEnabled}`);
    console.log(`[ImageModeComponent] Original image size: ${this.uploadedImageData.width}x${this.uploadedImageData.height}`);
    
    this.isLoading = true;
    this.isRefreshing = true;
    this.selectedImageIndex = null;
    this.rating = 0;
    this.promptAccuracy = 0;
    this.styleAccuracy = 0;
    this.showDetailedRatings = false;
    this.showImages = false;

    // Simulate API response with hardcoded images
    const mockApiResponse = {
      images: [
        'https://picsum.photos/400/400?random=1',
        'https://picsum.photos/400/400?random=2',
        'https://picsum.photos/400/400?random=3',
        'https://picsum.photos/400/400?random=4'
      ]
    };

    // Simulate API delay
    of(mockApiResponse).pipe(delay(1500)).subscribe(response => {
      console.log('[ImageModeComponent] Received stubbed API response:', response);
      this.generatedImages = response.images;
      this.isGenerated = true;
      this.isLoading = false;
      this.isRefreshing = false;
    });
  }

  // Component-specific event handlers
  onExpandDone(event: AnimationEvent) {
    if (event.phaseName === 'done' && event.fromState === 'void') {
      this.showImages = true;
    }
  }

  // Action handlers
  downloadPng() {
    if (this.selectedImageIndex === null || !this.generatedImages[this.selectedImageIndex]) {
      console.warn('[ImageModeComponent] No image selected for download');
      return;
    }
    console.log(`[ImageModeComponent] Download requested for: ${this.generatedImages[this.selectedImageIndex]}`);
    // TODO: Implement actual download functionality
  }

  importToDesigner() {
    if (this.selectedImageIndex === null || !this.generatedImages[this.selectedImageIndex]) {
      console.warn('[ImageModeComponent] No image selected for editing');
      return;
    }
    console.log(`[ImageModeComponent] Import to designer requested for: ${this.generatedImages[this.selectedImageIndex]}`);
    // TODO: Implement actual import to designer functionality
  }

  // Override base class method to add image generation logic
  onStyleChange(newStyle: string) {
    super.onStyleChange(newStyle); // Call base class logic
    
    // Add image-specific logic: regenerate if image is uploaded
    if (this.uploadedImageData) {
      this.generateImageVariations();
    }
  }

  get originalImageUrl(): string {
    return this.uploadedImageData?.preview || '';
  }
}