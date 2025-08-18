import { Component, OnInit, Input } from '@angular/core';
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
export class SymbolCreatorAiComponent implements OnInit {
  @Input() parentDialogRef?: MatDialogRef<any>; // Add this to receive and pass the reference

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
    this.stateService.resetAllState();
  }

  goToPromptMode() {
    this.stateService.resetAllState();
    this.currentMode = Mode.Prompt;
  }

  goToImageModeFromIntro() {
    this.stateService.resetAllState();
    // Switch directly to image mode - the unified component handles upload + controls + gallery
    this.currentMode = Mode.Image;
    this.uploadedImageData = null; // Start with no uploaded image, component will handle upload
  }

  goToImageModeFromPrompt(prompt: string) {
    this.promptText = prompt;
    this.generateImage();
    this.currentMode = Mode.Image;
  }

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

    this.http.post<{ images: string[] }>(`${environment.scaAiApiBase}/api/symbols/generate`, payload)
      .subscribe(response => {
        this.generatedImageUrl = response.images[0] || '';
      }, error => {
        console.error('Image generation error:', error);
        this.generatedImageUrl = '';
        this.lastError = 'Failed to generate image';
      });
  }

  onSaveRequested(imageUrl: string) {
    console.log('[SymbolCreatorAiComponent] Save requested for image:', imageUrl.substring(0, 50) + '...');
    this.generatedImageUrl = imageUrl;
    this.saveAndClose();
  }

  saveAndClose() {
    console.log('[SymbolCreatorAiComponent] Starting save and close process');
    
    // Clear any previous errors and show loading state
    this.lastError = null;
    this.isSaving = true;
    
    this.save().subscribe({
      next: (media) => {
        this.isSaving = false;
        console.log('[SymbolCreatorAiComponent] Save completed successfully:', media ? 'Media created' : 'No media returned');
        
        if (media) {
          console.log('[SymbolCreatorAiComponent] Closing dialog with media:', media.id);
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
    console.log('[SymbolCreatorAiComponent] Save method called');
    
    // Handle uploaded file directly
    if (this.uploadedImageData) {
      console.log('[SymbolCreatorAiComponent] Saving uploaded file:', this.uploadedImageData.file.name);
      return this.mediaService.add(this.uploadedImageData.file, null).pipe(
        catchError(err => {
          console.error('[SymbolCreatorAiComponent] Error saving uploaded image:', err);
          this.lastError = err.message || 'Error saving uploaded image';
          return of(null);
        })
      );
    }

    // Handle generated image URL
    if (!this.generatedImageUrl) {
      console.warn('[SymbolCreatorAiComponent] No image URL available for save');
      this.lastError = 'No image selected';
      return of(null);
    }

    console.log('[SymbolCreatorAiComponent] Fetching generated image from URL:', this.generatedImageUrl.substring(0, 50) + '...');
    return this.http.get(this.generatedImageUrl, { responseType: 'blob' }).pipe(
      switchMap(blob => {
        if (!blob) {
          console.error('[SymbolCreatorAiComponent] Failed to fetch image blob');
          this.lastError = 'Failed to fetch image';
          return of(null);
        }
        console.log('[SymbolCreatorAiComponent] Image blob fetched, size:', blob.size, 'bytes');
        console.log('[SymbolCreatorAiComponent] Adding blob to media service');
        return this.mediaService.add(blob, null); // Assumes null canvas is valid
      }),
      catchError(err => {
        console.error('[SymbolCreatorAiComponent] Error in save process:', err);
        this.lastError = err.message || 'Error saving image';
        return of(null);
      })
    );
  }
}