import { Component, Output, EventEmitter, OnDestroy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AiSymbolHttpService } from '@data/services/ai-symbol-http.service';
import { AiSymbolStateService } from '@data/services/ai-symbol-state.service';
import { ScaiAnalyticsService } from '@shared/services/scai-analytics.service';
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
  protected analytics?: ScaiAnalyticsService;

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
    hotkeysService: HotkeysService,
    analytics?: ScaiAnalyticsService
  ) {
    this.aiSymbolHttpService = aiSymbolHttpService;
    this.stateService = stateService;
    this.hotkeysService = hotkeysService;
    this.analytics = analytics;

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
    const currentUrl = this.stateService.currentGalleryState.generatedImages[index] || '';
    const mappedId = this.analytics?.getImageIdForUrl(currentUrl);
    const imageId = mappedId ?? (index + 1);
    if (imageId) {
      this.analytics?.createAction({ image_id: imageId, action_type: 'selected' }).subscribe();
    }
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
    // Log rating after mutation
    if (event.type === 'overall') {
      this.logRating('initial', event.value);
    } else if (event.type === 'prompt') {
      this.logRating('prompt accuracy', event.value);
    } else if (event.type === 'style') {
      this.logRating('style accuracy', event.value);
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
      const selectedIdx = this.stateService.currentGalleryState.selectedImageIndex;
      const mappedId = this.analytics?.getImageIdForUrl(imageUrl);
      const imageId = mappedId ?? (selectedIdx !== null ? selectedIdx + 1 : 0);
      if (imageId) {
        this.analytics?.createAction({ image_id: imageId, action_type: 'save' }).subscribe();
      }
      this.saveRequested.emit(imageUrl);
    } else {
      console.warn('No image selected for save');
    }
  }

  onRemoveBackground(): void {
    const selectedIdx = this.stateService.currentGalleryState.selectedImageIndex;
    const currentUrl = selectedIdx !== null ? this.stateService.currentGalleryState.generatedImages[selectedIdx] : '';

    const galleryState = this.stateService.currentGalleryState;

    if (galleryState.selectedImageIndex === null || !galleryState.generatedImages[galleryState.selectedImageIndex]) {
      return;
    }

    const imageUrl = galleryState.generatedImages[galleryState.selectedImageIndex];
    const originalImageUrl = galleryState.originalImages[galleryState.selectedImageIndex];

    if (!imageUrl || !originalImageUrl) {
      return;
    }

    // Check if we're in undo mode (current image is different from original)
    if (imageUrl !== originalImageUrl) {
      this.undoRemoveBackground();
      return;
    }

    // Record analytics action: Remove Background (only when actually removing)
    const mappedId = this.analytics?.getImageIdForUrl(currentUrl);
    const imageId = mappedId ?? (selectedIdx !== null ? selectedIdx + 1 : 0);
    if (imageId) {
      this.analytics?.createAction({ image_id: imageId, action_type: 'Remove Background' }).subscribe();
    }

    // Clear any previous errors
    this.stateService.clearApiError();

    // Set loading state
    this.stateService.setLoading(true);

    this.aiSymbolHttpService.removeBackground(imageUrl)
      .subscribe({
        next: (processedImageUrl) => {
          // removed custom log in favor of structured action event

          // Get the original URL before updating
          const originalUrl = galleryState.generatedImages[galleryState.selectedImageIndex!];

          // Update the selected image in the gallery with the processed image
          this.stateService.updateGeneratedImage(galleryState.selectedImageIndex!, processedImageUrl);

          // Update analytics mapping to point the new URL to the same database ID as the original URL
          if (processedImageUrl !== originalUrl) {
            this.analytics?.updateImageUrlMapping(originalUrl, processedImageUrl);
          }

          // Update the generated image record with the background-removed URL
          const imageId = this.analytics?.getImageIdForUrl(processedImageUrl);
          if (imageId) {
            this.analytics?.updateGeneratedImage(imageId, { image_url_bg_removed: processedImageUrl }).subscribe();
          }

          // Clear loading state
          this.stateService.setLoading(false);
        },
        error: (error) => {
          // removed custom log in favor of structured action event
          this.handleApiError(error);
        }
      });
  }

  private undoRemoveBackground(): void {
    const galleryState = this.stateService.currentGalleryState;

    if (galleryState.selectedImageIndex === null || !galleryState.originalImages[galleryState.selectedImageIndex]) {
      return;
    }

    const currentUrl = galleryState.generatedImages[galleryState.selectedImageIndex];
    // Record analytics action: Undo Background Removal
    const mappedId = this.analytics?.getImageIdForUrl(currentUrl);
    const imageId = mappedId ?? (galleryState.selectedImageIndex + 1);
    if (imageId) {
      this.analytics?.createAction({ image_id: imageId, action_type: 'Undo Background Removal' }).subscribe();
    }

    const originalImageUrl = galleryState.originalImages[galleryState.selectedImageIndex];
    const currentProcessedUrl = galleryState.generatedImages[galleryState.selectedImageIndex];

    // Restore the original image in the gallery
    this.stateService.updateGeneratedImage(galleryState.selectedImageIndex, originalImageUrl);

    // Update analytics mapping to point the original URL back to the same database ID
    if (currentProcessedUrl !== originalImageUrl) {
      this.analytics?.updateImageUrlMapping(currentProcessedUrl, originalImageUrl);
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

    const mappedId = this.analytics?.getImageIdForUrl(imageUrl);
    const imageId = mappedId ?? (galleryState.selectedImageIndex + 1);
    if (imageId) {
      this.analytics?.createAction({ image_id: imageId, action_type: 'download png' }).subscribe();
    }

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

  private logRating(type: 'initial' | 'prompt accuracy' | 'style accuracy', value: number) {
    const gallery = this.stateService.currentGalleryState;
    if (gallery.selectedImageIndex !== null) {
      const url = gallery.generatedImages[gallery.selectedImageIndex];
      const mappedId = this.analytics?.getImageIdForUrl(url);
      const imageId = mappedId ?? (gallery.selectedImageIndex + 1);
      if (imageId) {
        const key = `${imageId}:${type}`;
        const existingId = (this.analytics as any)?.imageIdAndTypeToRatingId?.get?.(key);
        if (existingId) {
          this.analytics?.updateImageRating(existingId, { value }).subscribe();
        } else {
          this.analytics?.createImageRating({ image_id: imageId, rating_type: type, value }).subscribe();
        }
      }
    }
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
