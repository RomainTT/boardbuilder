import { Component, EventEmitter, Output } from '@angular/core';
import { AiSymbolService } from '@data/services/ai-symbol.service';

// Style configuration interface (extracted from both components)
export interface StyleConfig {
  background: boolean;
  outlineWidth: number;
  saturation: string;
}

@Component({
  template: ''  // Abstract component with no template
})
export abstract class BaseSymbolCreatorComponent {
  @Output() saveRequested = new EventEmitter<string>();

  // AI Symbol Service will be injected by child components
  protected aiSymbolService?: AiSymbolService;

  // Style management system (identical in both child components)
  selectedStyle: string = 'Mulberry';
  additionalText: string = '';
  backgroundEnabled: boolean = true;
  outlinesEnabled: boolean = true;
  
  public availableStyles: string[] = [];

  // Gallery state management (common to both child components)
  generatedImages: string[] = [];
  selectedImageIndex: number | null = null;
  isGenerated: boolean = false;
  showImages: boolean = false;
  isLoading: boolean = false;
  isRefreshing: boolean = false;

  // Rating state management (common to both child components)
  rating: number = 0;
  promptAccuracy: number = 0;
  styleAccuracy: number = 0;
  showDetailedRatings: boolean = false;

  // API Error state management (common to all child components)
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

  // Initialize the style system (call from child ngOnInit)
  protected initializeStyles() {
    this.availableStyles = Object.keys(this.styleConfigs);
    this.updateFromConfig();
  }

  // Update component properties based on selected style configuration
  protected updateFromConfig() {
    const config = this.styleConfigs[this.selectedStyle];
    if (config) {
      this.backgroundEnabled = config.background;
      this.outlinesEnabled = true;
      this.outlineWidth = config.outlineWidth;
      this.saturation = config.saturation;
    } else {
      // Fallback defaults
      this.backgroundEnabled = true;
      this.outlinesEnabled = true;
      this.outlineWidth = 2;
      this.saturation = 'bold';
    }
  }

  // Style change handler (common logic)
  onStyleChange(newStyle: string) {
    this.selectedStyle = newStyle;
    this.updateFromConfig();
    // Child components can override this method to add additional logic
  }

  // Common gallery methods (identical in both child components)
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

  // Common rating methods (identical in both child components)
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

  // Common getter (identical in both child components)
  get selectedImageUrl(): string {
    if (this.selectedImageIndex !== null && this.generatedImages[this.selectedImageIndex]) {
      return this.generatedImages[this.selectedImageIndex];
    }
    return '';
  }

  // Common action methods (identical in both child components)
  onSave() {
    if (this.selectedImageIndex !== null && this.generatedImages[this.selectedImageIndex]) {
      this.saveRequested.emit(this.generatedImages[this.selectedImageIndex]);
    } else {
      console.warn('No image selected for save');
    }
  }

  // Common download method that child components can use
  performDownload(prompt?: string) {
    if (this.selectedImageIndex === null || !this.generatedImages[this.selectedImageIndex]) {
      console.warn('No image selected for download');
      return;
    }

    if (!this.aiSymbolService) {
      console.error('AI Symbol Service not available');
      return;
    }

    const imageUrl = this.generatedImages[this.selectedImageIndex];
    const filename = this.aiSymbolService.generateFilename(prompt || 'ai_generated', this.selectedStyle);

    this.aiSymbolService.performDownload(imageUrl, filename)
      .subscribe({
        next: () => {
          console.log('Download completed successfully');
        },
        error: (error) => {
          console.error('Error downloading PNG:', error);
        }
      });
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
}