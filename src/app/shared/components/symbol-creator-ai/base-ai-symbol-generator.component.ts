import { Component, Output, EventEmitter, OnDestroy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AiSymbolHttpService } from '@data/services/ai-symbol-http.service';
import { AiSymbolStateService } from '@data/services/ai-symbol-state.service';
import { RatingChangeEvent } from '@shared/components/ai-selected-image/ai-selected-image.component';
import { HotkeysService, Hotkey } from '@conflito/angular2-hotkeys';

@Component({
  template: ''
})
export abstract class BaseAiSymbolGeneratorComponent implements OnDestroy {
  @Output() saveRequested = new EventEmitter<string>();

  // Services
  protected aiSymbolHttpService: AiSymbolHttpService;
  protected stateService: AiSymbolStateService;
  protected hotkeysService: HotkeysService;

  // Subscription management
  protected destroy$ = new Subject<void>();

  // Shared prompt display functionality
  fullPrompt: string = '';
  showPrompt: boolean = false;
  private promptHotkey: Hotkey | null = null;


  // State observables (initialized in constructor)
  galleryState$: any;
  ratingState$: any;
  styleState$: any;
  errorState$: any;
  selectedImageUrl$: any;

  constructor(
    aiSymbolHttpService: AiSymbolHttpService,
    stateService: AiSymbolStateService,
    hotkeysService: HotkeysService
  ) {
    this.aiSymbolHttpService = aiSymbolHttpService;
    this.stateService = stateService;
    this.hotkeysService = hotkeysService;

    // Initialize observables after services are assigned
    this.galleryState$ = this.stateService.galleryState$;
    this.ratingState$ = this.stateService.ratingState$;
    this.styleState$ = this.stateService.styleState$;
    this.errorState$ = this.stateService.errorState$;
    this.selectedImageUrl$ = this.stateService.selectedImageUrl$;

    // Setup shared prompt hotkey
    this.promptHotkey = new Hotkey('ctrl+p', (event: KeyboardEvent): boolean => {
      this.showPrompt = !this.showPrompt;
      return false;
    });
    this.hotkeysService.add(this.promptHotkey);
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

  // Handle rating changes from ai-selected-image component
  onRatingChanged(event: RatingChangeEvent): void {
    switch (event.type) {
      case 'overall':
        this.stateService.setRating(event.value);
        break;
      case 'prompt':
        this.stateService.setPromptAccuracy(event.value);
        break;
      case 'style':
        this.stateService.setStyleAccuracy(event.value);
        break;
    }
  }

  // Shared style methods
  onStyleChanged(newStyle: string): void {
    this.stateService.setSelectedStyle(newStyle);
  }

  onCultureTextChanged(newText: string): void {
    this.stateService.setCultureText(newText);
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

  onRemoveBackground(): void {
    console.log('[BaseAiSymbolGeneratorComponent] onRemoveBackground called');

    const galleryState = this.stateService.currentGalleryState;
    console.log('[BaseAiSymbolGeneratorComponent] Gallery state:', {
      selectedImageIndex: galleryState.selectedImageIndex,
      totalImages: galleryState.generatedImages.length,
      hasSelectedImage: galleryState.selectedImageIndex !== null && !!galleryState.generatedImages[galleryState.selectedImageIndex]
    });

    if (galleryState.selectedImageIndex === null || !galleryState.generatedImages[galleryState.selectedImageIndex]) {
      console.warn('[BaseAiSymbolGeneratorComponent] No image selected for background removal');
      return;
    }

    const imageUrl = galleryState.generatedImages[galleryState.selectedImageIndex];
    const originalImageUrl = galleryState.originalImages[galleryState.selectedImageIndex];
    console.log('[BaseAiSymbolGeneratorComponent] Remove background clicked:', {
      selectedIndex: galleryState.selectedImageIndex,
      currentImage: imageUrl?.substring(0, 50),
      originalImage: originalImageUrl?.substring(0, 50),
      isUndoMode: imageUrl !== originalImageUrl
    });

    if (!imageUrl || !originalImageUrl) {
      console.warn('[BaseAiSymbolGeneratorComponent] Selected image URL is empty');
      return;
    }

    // Check if we're in undo mode (current image is different from original)
    if (imageUrl !== originalImageUrl) {
      console.log('[BaseAiSymbolGeneratorComponent] Undo mode: restoring original image');
      this.undoRemoveBackground();
      return;
    }

    // Clear any previous errors
    this.stateService.clearApiError();

    // Set loading state
    this.stateService.setLoading(true);
    console.log('[BaseAiSymbolGeneratorComponent] Set loading state to true, calling removeBackground API');

    this.aiSymbolHttpService.removeBackground(imageUrl)
      .subscribe({
        next: (processedImageUrl) => {
          console.log('[BaseAiSymbolGeneratorComponent] Background removal successful, updating gallery with:', processedImageUrl.substring(0, 50) + '...');

          // Update the selected image in the gallery with the processed image
          this.stateService.updateGeneratedImage(galleryState.selectedImageIndex!, processedImageUrl);

          console.log('[BaseAiSymbolGeneratorComponent] Background removal completed');

          // Clear loading state
          this.stateService.setLoading(false);
          console.log('[BaseAiSymbolGeneratorComponent] Cleared loading state');
        },
        error: (error) => {
          console.error('[BaseAiSymbolGeneratorComponent] Error removing background:', error);
          this.handleApiError(error);
        }
      });
  }

  private undoRemoveBackground(): void {
    const galleryState = this.stateService.currentGalleryState;

    if (galleryState.selectedImageIndex === null || !galleryState.originalImages[galleryState.selectedImageIndex]) {
      console.warn('[BaseAiSymbolGeneratorComponent] Cannot undo - no original image stored');
      return;
    }

    const originalImageUrl = galleryState.originalImages[galleryState.selectedImageIndex];
    console.log('[BaseAiSymbolGeneratorComponent] Restoring original image:', originalImageUrl);

    // Restore the original image in the gallery
    this.stateService.updateGeneratedImage(galleryState.selectedImageIndex, originalImageUrl);

    console.log('[BaseAiSymbolGeneratorComponent] Undo completed');
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

  // Button text for remove background functionality
  get removeBackgroundButtonText(): string {
    const galleryState = this.stateService.currentGalleryState;
    const selectedIndex = galleryState.selectedImageIndex;
    const currentImage = selectedIndex !== null ? galleryState.generatedImages[selectedIndex] : null;
    const originalImage = selectedIndex !== null ? galleryState.originalImages[selectedIndex] : null;

    console.log('[BaseAiSymbolGeneratorComponent] Button text check:', {
      selectedIndex,
      currentImage: currentImage?.substring(0, 50),
      originalImage: originalImage?.substring(0, 50),
      isDifferent: currentImage !== originalImage
    });

    if (selectedIndex !== null &&
        currentImage &&
        originalImage &&
        currentImage !== originalImage) {
      return 'Undo Remove Background';
    }
    return 'Remove Background';
  }

  // Track by function for *ngFor optimization
  trackByIndex(index: number, item: any): number {
    return index;
  }

  // Shared prompt functionality
  copyPrompt(): void {
    if (this.fullPrompt) {
      navigator.clipboard.writeText(this.fullPrompt)
        .then(() => {
          // Prompt copied to clipboard successfully
        })
        .catch(err => {
          console.error('Failed to copy prompt:', err);
        });
    }
  }

  ngOnDestroy(): void {
    // Clean up prompt hotkey
    if (this.promptHotkey) {
      this.hotkeysService.remove(this.promptHotkey);
    }
    
    this.destroy$.next();
    this.destroy$.complete();
  }
}
