import { Component, OnInit, Input } from '@angular/core';
import { of, Observable } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { Media } from '@data/models/media.model';
import { MediaService } from '@data/services/media.service';
import { HttpClient } from '@angular/common/http';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ImageBase64Service } from '@data/services/image-base64.service';
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

  constructor(
    private mediaService: MediaService,
    private http: HttpClient,
    private imageBase64Service: ImageBase64Service,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<SymbolCreatorAIDialogComponent>
  ) { }

  ngOnInit(): void {
  }

  goToPromptMode() {
    this.currentMode = Mode.Prompt;
  }

  goToImageModeFromIntro() {
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
    this.generatedImageUrl = imageUrl;
    this.saveAndClose();
  }

  saveAndClose() {
    this.save().subscribe(media => {
      if (media) {
        this.dialogRef.close(media);
      }
    }, error => {
      console.error('Save error:', error);
      this.lastError = error.error?.message || 'Failed to save image';
    });
  }

  save(): Observable<Media> {
    // Handle uploaded file directly
    if (this.uploadedImageData) {
      return this.mediaService.add(this.uploadedImageData.file, null).pipe(
        catchError(err => {
          this.lastError = err.message || 'Error saving uploaded image';
          return of(null);
        })
      );
    }

    // Handle generated image URL
    if (!this.generatedImageUrl) {
      this.lastError = 'No image selected';
      return of(null);
    }

    return this.http.get(this.generatedImageUrl, { responseType: 'blob' }).pipe(
      switchMap(blob => {
        if (!blob) {
          this.lastError = 'Failed to fetch image';
          return of(null);
        }
        return this.mediaService.add(blob, null); // Assumes null canvas is valid
      }),
      catchError(err => {
        this.lastError = err.message || 'Error saving image';
        return of(null);
      })
    );
  }
}