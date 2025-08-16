import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { AnimationEvent } from '@angular/animations';
import { ImageUploadResult } from '../../image-upload-dialog/image-upload-dialog.component';
import { AiSymbolService } from '@data/services/ai-symbol.service';
import { AiImageToImageParams, PromptBuilderOptions } from '@data/models/ai-symbol.interfaces';
import { MatDialogRef } from '@angular/material/dialog';

// Style configuration interface
export interface StyleConfig {
  background: boolean;
  outlineWidth: number;
  saturation: string;
}

@Component({
  selector: 'app-image-mode',
  templateUrl: './image-mode.component.html',
  styleUrls: ['./image-mode.component.scss']
})
export class ImageModeComponent implements OnInit {
  @Output() saveRequested = new EventEmitter<string>();
  @Input() uploadedImageData: ImageUploadResult | null = null;
  @Input() parentDialogRef?: MatDialogRef<any>;

  // Style management system
  selectedStyle: string = 'Mulberry';
  additionalText: string = '';
  backgroundEnabled: boolean = true;
  outlinesEnabled: boolean = true;
  
  public availableStyles: string[] = [];

  // Gallery state management
  generatedImages: string[] = [];
  selectedImageIndex: number | null = null;
  isGenerated: boolean = false;
  showImages: boolean = false;
  isLoading: boolean = false;
  isRefreshing: boolean = false;

  // Rating state management
  rating: number = 0;
  promptAccuracy: number = 0;
  styleAccuracy: number = 0;
  showDetailedRatings: boolean = false;

  // API Error state management
  apiError: string | null = null;
  showApiError: boolean = false;
  
  private styleConfigs: Record<string, StyleConfig> = {
    'Mulberry': { background: false, outlineWidth: 7, saturation: 'bold' },
    'Jellow': { background: true, outlineWidth: 5, saturation: 'bold' },
    'Tawasol': { background: true, outlineWidth: 4, saturation: 'bold' },
    'ARASAAC': { background: true, outlineWidth: 4, saturation: 'bold' },
    'Dyvogra': { background: true, outlineWidth: 2, saturation: 'soft' },
  };
  
  protected outlineWidth: number = 7;
  protected saturation: string = 'bold';

  constructor(private aiSymbolService: AiSymbolService) {}

  ngOnInit() {
    // Initialize styles
    this.initializeStyles();
    // Component ready - user can upload image and configure settings
  }

  // Initialize the style system
  private initializeStyles() {
    this.availableStyles = Object.keys(this.styleConfigs);
    this.updateFromConfig();
  }

  // Update component properties based on selected style configuration
  private updateFromConfig() {
    const config = this.styleConfigs[this.selectedStyle];
    if (config) {
      this.backgroundEnabled = config.background;
      // Note: outlinesEnabled, outlineWidth, saturation are used in buildPrompt but not exposed to UI
    } else {
      // Fallback defaults
      this.backgroundEnabled = true;
    }
  }

  // Image upload handling
  onImageUploaded(result: ImageUploadResult) {
    this.uploadedImageData = result;
    console.log('[ImageModeComponent] Image uploaded:', {
      filename: result.file.name,
      dimensions: `${result.width}x${result.height}`,
      fileSize: `${(result.file.size / 1024).toFixed(1)}KB`
    });
    
    // Clear any previous generation results
    this.clearPreviousResults();
  }

  clearUploadedImage() {
    this.uploadedImageData = null;
    this.clearPreviousResults();
  }

  private clearPreviousResults() {
    this.generatedImages = [];
    this.selectedImageIndex = null;
    this.isGenerated = false;
    this.showImages = false;
    this.isLoading = false;
    this.isRefreshing = false;
    this.clearApiError();
  }

  // AI Controls event handlers
  onStyleChanged(newStyle: string) {
    this.selectedStyle = newStyle;
    this.updateFromConfig();
  }

  onAdditionalTextChanged(newText: string) {
    this.additionalText = newText;
  }

  onBackgroundEnabledChanged(enabled: boolean) {
    this.backgroundEnabled = enabled;
  }

  onGenerateClicked() {
    this.generateImageVariations();
  }

  // Common gallery methods
  selectImage(index: number) {
    this.selectedImageIndex = index;
    this.rating = 0;
    this.promptAccuracy = 0;
    this.styleAccuracy = 0;
    this.showDetailedRatings = false;
  }

  closeSelected() {
    this.selectedImageIndex = null;
    this.rating = 0;
    this.promptAccuracy = 0;
    this.styleAccuracy = 0;
    this.showDetailedRatings = false;
  }

  // Common rating methods
  setRating(value: number) {
    this.rating = value;
    if (value > 0) {
      this.showDetailedRatings = true;
    }
  }

  setPromptAccuracy(value: number) {
    this.promptAccuracy = value;
  }

  setStyleAccuracy(value: number) {
    this.styleAccuracy = value;
  }

  // Common getter
  get selectedImageUrl(): string {
    if (this.selectedImageIndex !== null && this.generatedImages[this.selectedImageIndex]) {
      return this.generatedImages[this.selectedImageIndex];
    }
    return '';
  }

  // Common action methods
  onSave() {
    if (this.selectedImageIndex !== null && this.generatedImages[this.selectedImageIndex]) {
      this.saveRequested.emit(this.generatedImages[this.selectedImageIndex]);
    } else {
      console.warn('No image selected for save');
    }
  }

  // Common error handling methods
  setApiError(message: string) {
    this.apiError = message;
    this.showApiError = true;
    this.isLoading = false;
    this.isRefreshing = false;
  }

  clearApiError() {
    this.apiError = null;
    this.showApiError = false;
  }

  // Common method for handling API failures in image generation
  handleApiError(error: any) {
    console.error('API error:', error);
    
    // Extract meaningful error message from different error types
    let errorMessage = 'Failed to generate images. Please try again.';
    if (error?.message) {
      errorMessage = error.message;
    } else if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error?.status) {
      errorMessage = `HTTP ${error.status}: ${error.statusText || 'Request failed'}`;
    }
    
    this.setApiError(errorMessage);
    // Show empty images as fallback (existing behavior)
    this.generatedImages = Array(4).fill('');
    this.isGenerated = true;
    if (this.showImages !== undefined) {
      this.showImages = true;
    }
  }

  // Generate image variations using AiSymbolService
  generateImageVariations() {
    if (!this.uploadedImageData) {
      console.warn('[ImageModeComponent] No uploaded image data available');
      return;
    }

    const generationId = Date.now().toString(36);
    console.log(`[ImageModeComponent] Starting image-to-image generation [${generationId}]`);
    
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

    // Build prompt using service (consistent with TextModeComponent)
    const config = this.styleConfigs[this.selectedStyle];
    const promptOptions: PromptBuilderOptions = {
      basePrompt: 'symbol', // Default base prompt for image-to-image
      style: this.selectedStyle,
      culture: this.additionalText,
      backgroundEnabled: this.backgroundEnabled,
      outlinesEnabled: true,
      outlineWidth: config ? config.outlineWidth : 7,
      saturation: config ? config.saturation : 'bold'
    };
    
    const fullPrompt = this.aiSymbolService.buildPrompt(promptOptions);
    console.log(`[ImageModeComponent] Built prompt [${generationId}]:`, fullPrompt);

    // Build parameters for image-to-image generation
    const params: AiImageToImageParams = {
      image: this.uploadedImageData.base64,
      prompt: fullPrompt, // Use the built prompt
      num_images: 4,
      steps: 4
    };

    // Call the service to generate image variations
    this.aiSymbolService.generateImageVariations(params)
      .subscribe({
        next: (response) => {
          console.log(`[ImageModeComponent] ✓ Generation completed [${generationId}]:`, {
            imagesGenerated: response.images.length,
            firstImagePreview: response.images[0] ? `${response.images[0].substring(0, 50)}...` : 'none'
          });
          this.generatedImages = response.images;
          this.isGenerated = true;
          this.isLoading = false;
          this.isRefreshing = false;
        },
        error: (error) => {
          console.error(`[ImageModeComponent] ✗ Generation failed [${generationId}]:`, error);
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
    if (this.selectedImageIndex === null || !this.generatedImages[this.selectedImageIndex]) {
      console.warn('No image selected for download');
      return;
    }

    const imageUrl = this.generatedImages[this.selectedImageIndex];
    const filename = this.aiSymbolService.generateFilename('image_variation', this.selectedStyle);

    this.aiSymbolService.performDownload(imageUrl, filename)
      .subscribe({
        next: () => {
          // Download handled by service
        },
        error: (error) => {
          console.error('Error downloading PNG:', error);
        }
      });
  }

  importToDesigner() {
    if (this.selectedImageIndex === null || !this.generatedImages[this.selectedImageIndex]) {
      console.warn('[ImageModeComponent] No image selected for import to designer');
      return;
    }
    console.log('[ImageModeComponent] Importing generated image to designer');
    // TODO: Implement actual import to designer functionality
  }


  get originalImageUrl(): string {
    return this.uploadedImageData?.preview || '';
  }
}