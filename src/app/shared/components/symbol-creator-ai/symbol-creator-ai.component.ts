import { Component, OnInit, AfterViewInit, Input, ChangeDetectionStrategy } from '@angular/core';
import { of, Observable } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { Media } from '@data/models/media.model';
import { MediaService } from '@data/services/media.service';
import { HttpClient } from '@angular/common/http';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ImageBase64Service } from '@data/services/image-base64.service';
import { AiSymbolStateService } from '@data/services/ai-symbol-state.service';
import { SymbolCreatorAIDialogComponent } from '../symbol-creator-ai-dialog/symbol-creator-ai-dialog.component';
import { ImageUploadDialogComponent, ImageUploadDialogData, ImageUploadResult } from '../image-upload-dialog/image-upload-dialog.component';
import { SymbolSearchResult } from '@data/models/symbol-search-result';
import { environment } from '@env';

enum Mode {
  Prompt = 'prompt',
  Image = 'image'
}

@Component({
  selector: 'app-symbol-creator-ai',
  templateUrl: './symbol-creator-ai.component.html',
  styleUrls: ['./symbol-creator-ai.component.scss']
})
export class SymbolCreatorAiComponent implements OnInit, AfterViewInit {
  @Input() parentDialogRef?: MatDialogRef<any>; // Add this to receive and pass the reference
  @Input() preloadedImageData?: ImageUploadResult; // For pre-loaded images from search results

  currentMode: Mode | null = null;
  Mode = Mode;

  promptText: string = '';
  generatedImageUrl: string = '';
  uploadedImageData: ImageUploadResult | null = null;
  lastError: string | null = null; // For error handling like SymbolCreatorComponent
  isSaving: boolean = false; // Loading state for save operation

  constructor(
    private mediaService: MediaService,
    private http: HttpClient,
    private imageBase64Service: ImageBase64Service,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private stateService: AiSymbolStateService,
    public dialogRef: MatDialogRef<SymbolCreatorAIDialogComponent>
  ) { }

  ngOnInit(): void {
    // Delay state reset to avoid change detection errors
    setTimeout(() => {
      this.stateService.resetAllState();
      // Skip mode selection and go directly to text mode
      this.goToPromptMode();
    }, 0);
  }

  ngAfterViewInit(): void {
    // View is fully initialized, safe to set mode and avoid change detection errors
    // COMMENTED OUT: Image mode functionality preserved but hidden from UI
    // if (this.preloadedImageData) {
    //   console.log('[SymbolCreatorAI] Pre-loaded image detected, switching to image mode:', {
    //     filename: this.preloadedImageData.file?.name,
    //     dimensions: `${this.preloadedImageData.width}x${this.preloadedImageData.height}`
    //   });

    //   // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
    //   // This ensures the mode change happens after the current change detection cycle
    //   setTimeout(() => {
    //     this.goToImageModeWithPreloadedImage(this.preloadedImageData!);
    //   }, 0);
    // }
  }

  goToPromptMode() {
    this.stateService.resetAllState();
    this.currentMode = Mode.Prompt;
  }

  // COMMENTED OUT: Image mode functionality preserved but hidden from UI
  // goToImageModeFromIntro() {
  //   this.stateService.resetAllState();
  //   // Switch directly to image mode - the unified component handles upload + controls + gallery
  //   this.currentMode = Mode.Image;
  //   this.uploadedImageData = null; // Start with no uploaded image, component will handle upload
  // }

  /**
   * Switches to image mode with pre-loaded image data from search result
   * @param imageData - Pre-converted ImageUploadResult from search result
   */
  // COMMENTED OUT: Image mode functionality preserved but hidden from UI
  // goToImageModeWithPreloadedImage(imageData: ImageUploadResult) {
  //   console.log('[SymbolCreatorAI] Switching to image mode with pre-loaded image');
  //   this.stateService.resetAllState();
  //   this.currentMode = Mode.Image;
  //   this.uploadedImageData = imageData; // Pre-load the image data
  //   console.log('[SymbolCreatorAI] Image mode activated with uploaded data:', {
  //     hasFile: !!imageData.file,
  //     hasBase64: !!imageData.base64,
  //     hasPreview: !!imageData.preview
  //   });
  // }

  // COMMENTED OUT: Image mode functionality preserved but hidden from UI
  // goToImageModeFromPrompt(prompt: string) {
  //   this.promptText = prompt;
  //   this.generateImage();
  //   this.currentMode = Mode.Image;
  // }

  goBackToDefault() {
    this.stateService.resetAllState();
    this.currentMode = null;
    this.lastError = null;
    this.uploadedImageData = null;
  }

  private showError(message: string) {
    this.lastError = message;
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['error-snackbar']
    });
  }

  private generateImage() {
    const payload = {
      prompt: this.promptText || 'default prompt',
      num_images: 1,
      steps: 4
    };

    this.http.post<{ images: string[] }>(
      `${environment.boardBuilderApiBase}/ai/generate_image`,
      { prompt: this.promptText || 'default prompt' }
    )
      .subscribe(response => {
        this.generatedImageUrl = response.images[0] || '';
      }, error => {
        console.error('Image generation error:', error);
        this.generatedImageUrl = '';
        this.lastError = 'Failed to generate image';
      });
  }

  onSaveRequested(imageUrl: string) {
    this.generatedImageUrl = imageUrl;
    this.saveAndClose();
  }

  saveAndClose() {
    // Clear any previous errors and show loading state
    this.lastError = null;
    this.isSaving = true;
    
    this.save().subscribe({
      next: (media) => {
        this.isSaving = false;

        if (media) {
          // Clear the selected image state so the panel closes
          this.stateService.clearSelection();
          this.dialogRef.close(media);
        } else {
          console.warn('[SymbolCreatorAiComponent] Save returned null/undefined media - dialog will not close');
          this.lastError = 'Save completed but no media was returned';
          this.showError('Failed to save image. Please try again.');
        }
      },
      error: (error) => {
        this.isSaving = false;
        console.error('[SymbolCreatorAiComponent] Save failed:', error);
        this.lastError = error.error?.message || 'Failed to save image';
        this.showError(this.lastError);
        // Don't close dialog on error - let user try again
      }
    });
  }

  save(): Observable<Media> {
    // Priority 1: Handle generated image URL (selected variation)
    if (this.generatedImageUrl) {
      return this.http.get(this.generatedImageUrl, { responseType: 'blob' }).pipe(
        switchMap(blob => {
          if (!blob) {
            console.error('[SymbolCreatorAiComponent] Failed to fetch generated image blob');
            this.lastError = 'Failed to fetch generated image';
            return of(null);
          }
          return this.mediaService.add(blob, null);
        }),
        catchError(err => {
          console.error('[SymbolCreatorAiComponent] Error saving generated image:', err);
          this.lastError = err.message || 'Error saving generated image';
          return of(null);
        })
      );
    }
    
    // Priority 2: Handle uploaded file directly (fallback for original image)
    if (this.uploadedImageData) {
      return this.mediaService.add(this.uploadedImageData.file, null).pipe(
        catchError(err => {
          console.error('[SymbolCreatorAiComponent] Error saving uploaded image:', err);
          this.lastError = err.message || 'Error saving uploaded image';
          return of(null);
        })
      );
    }

    // No image available
    console.warn('[SymbolCreatorAiComponent] No image available for save');
    this.lastError = 'No image selected';
    return of(null);
  }
}