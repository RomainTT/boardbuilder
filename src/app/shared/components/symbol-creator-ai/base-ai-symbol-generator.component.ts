import { Component, Output, EventEmitter, OnDestroy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AiSymbolHttpService } from '@data/services/ai-symbol-http.service';
import { AiSymbolStateService } from '@data/services/ai-symbol-state.service';

@Component({
  template: ''
})
export abstract class BaseAiSymbolGeneratorComponent implements OnDestroy {
  @Output() saveRequested = new EventEmitter<string>();

  // Services
  protected aiSymbolHttpService: AiSymbolHttpService;
  protected stateService: AiSymbolStateService;

  // Subscription management
  protected destroy$ = new Subject<void>();

  // State observables (initialized in constructor)
  galleryState$: any;
  ratingState$: any;
  styleState$: any;
  errorState$: any;
  selectedImageUrl$: any;

  constructor(
    aiSymbolHttpService: AiSymbolHttpService,
    stateService: AiSymbolStateService
  ) {
    this.aiSymbolHttpService = aiSymbolHttpService;
    this.stateService = stateService;
    
    // Initialize observables after services are assigned
    this.galleryState$ = this.stateService.galleryState$;
    this.ratingState$ = this.stateService.ratingState$;
    this.styleState$ = this.stateService.styleState$;
    this.errorState$ = this.stateService.errorState$;
    this.selectedImageUrl$ = this.stateService.selectedImageUrl$;
  }

  // Abstract method that components must implement
  abstract generateImages(): void;

  // Shared gallery methods
  selectImage(index: number): void {
    this.stateService.selectImage(index);
  }

  closeSelected(): void {
    this.stateService.clearSelection();
  }

  // Shared rating methods
  setRating(value: number): void {
    this.stateService.setRating(value);
  }

  setPromptAccuracy(value: number): void {
    this.stateService.setPromptAccuracy(value);
  }

  setStyleAccuracy(value: number): void {
    this.stateService.setStyleAccuracy(value);
  }

  // Shared style methods
  onStyleChanged(newStyle: string): void {
    this.stateService.setSelectedStyle(newStyle);
  }

  onAdditionalTextChanged(newText: string): void {
    this.stateService.setAdditionalText(newText);
  }

  onBackgroundEnabledChanged(enabled: boolean): void {
    this.stateService.setBackgroundEnabled(enabled);
  }

  onGenerateClicked(): void {
    this.generateImages();
  }

  // Shared action methods
  onSave(): void {
    const imageUrl = this.stateService.selectedImageUrl;
    if (imageUrl) {
      this.saveRequested.emit(imageUrl);
    } else {
      console.warn('No image selected for save');
    }
  }

  // Shared error handling methods
  handleApiError(error: any): void {
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
    
    this.stateService.setApiError(errorMessage);
    
    // Show empty images as fallback (existing behavior)
    this.stateService.setGeneratedImages(Array(4).fill(''));
    this.stateService.setShowImages(true);
  }

  clearApiError(): void {
    this.stateService.clearApiError();
  }

  // Shared download method
  downloadPng(): void {
    const galleryState = this.stateService.currentGalleryState;
    if (galleryState.selectedImageIndex === null || !galleryState.generatedImages[galleryState.selectedImageIndex]) {
      console.warn('No image selected for download');
      return;
    }

    const imageUrl = galleryState.generatedImages[galleryState.selectedImageIndex];
    const styleState = this.stateService.currentStyleState;
    
    // Generate filename - subclasses can override this if they need specific logic
    const filename = this.generateDownloadFilename(styleState.selectedStyle);

    this.aiSymbolHttpService.performDownload(imageUrl, filename)
      .subscribe({
        next: () => {
          // Download handled by service
        },
        error: (error) => {
          console.error('Error downloading PNG:', error);
        }
      });
  }

  // Protected method that can be overridden by subclasses for custom filename generation
  protected generateDownloadFilename(style: string): string {
    // Default implementation - can be overridden
    return this.aiSymbolHttpService.generateFilename('ai_generated', style);
  }

  // Utility getter for templates
  get selectedImageUrl(): string {
    return this.stateService.selectedImageUrl;
  }

  // Track by function for *ngFor optimization
  trackByIndex(index: number, item: any): number {
    return index;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}