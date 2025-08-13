import { Component, Input, OnInit } from '@angular/core';
import { trigger, transition, style, animate, AnimationEvent } from '@angular/animations';
import { ImageUploadResult } from '../../image-upload-dialog/image-upload-dialog.component';
import { BaseSymbolCreatorComponent } from '../base-symbol-creator.component';
import { AiSymbolService } from '@data/services/ai-symbol.service';
import { AiImageToImageParams } from '@data/models/ai-symbol.interfaces';

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

  constructor(private aiSymbolServicePrivate: AiSymbolService) {
    super();
    this.aiSymbolService = this.aiSymbolServicePrivate;
  }

  ngOnInit() {
    // Initialize styles using base class method
    this.initializeStyles();
    
    // Auto-generate variations when component loads with uploaded image
    if (this.uploadedImageData) {
      this.generateImageVariations();
    }
  }

  // Generate image variations using AiSymbolService
  generateImageVariations() {
    if (!this.uploadedImageData) {
      console.warn('[ImageModeComponent] No uploaded image data available');
      return;
    }

    console.log('[ImageModeComponent] Starting image-to-image generation using AiSymbolService');
    console.log(`[ImageModeComponent] Original image size: ${this.uploadedImageData.width}x${this.uploadedImageData.height}`);
    console.log(`[ImageModeComponent] Style: ${this.selectedStyle}, Culture: ${this.additionalText}`);
    
    // Clear any previous errors
    this.clearApiError();
    
    this.isLoading = true;
    this.isRefreshing = true;
    this.selectedImageIndex = null;
    this.rating = 0;
    this.promptAccuracy = 0;
    this.styleAccuracy = 0;
    this.showDetailedRatings = false;
    this.showImages = false;

    this.generatedImages = Array(4).fill('');

    // Build parameters for image-to-image generation
    const params: AiImageToImageParams = {
      image: this.uploadedImageData.base64,
      style: this.selectedStyle,
      culture: this.additionalText || undefined,
      backgroundEnabled: this.backgroundEnabled,
      outlinesEnabled: this.outlinesEnabled,
      outlineWidth: this.outlineWidth,
      saturation: this.saturation,
      num_images: 4,
      steps: 4
    };

    // Call the service to generate image variations
    this.aiSymbolServicePrivate.generateImageVariations(params)
      .subscribe({
        next: (response) => {
          console.log('[ImageModeComponent] Received API response:', response);
          this.generatedImages = response.images;
          this.isGenerated = true;
          this.isLoading = false;
          this.isRefreshing = false;
        },
        error: (error) => {
          console.error('[ImageModeComponent] API error:', error);
          this.handleApiError(error);
        }
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
    console.log('[ImageModeComponent] downloadPng called, using service via base class');
    this.performDownload('image_variation');
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