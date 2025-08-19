import {Component, Inject, ViewChild, Input, ChangeDetectionStrategy} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {Media} from '@data/models/media.model';
import {SymbolCreatorAiComponent } from '../symbol-creator-ai/symbol-creator-ai.component';
import { ImageUploadResult } from '../image-upload-dialog/image-upload-dialog.component';

export interface SymbolCreatorAIDialogData {
  media?: Media;
  preloadedImageData?: ImageUploadResult;
}

@Component({
  selector: 'app-symbol-creator-ai-dialog',
  templateUrl: './symbol-creator-ai-dialog.component.html',
  styleUrls: ['./symbol-creator-ai-dialog.component.scss']
})
export class SymbolCreatorAIDialogComponent {
  media: Media;
  preloadedImageData?: ImageUploadResult;
  @Input() parentDialogRef?: MatDialogRef<any>; // Add this to receive the parent dialog reference

  @ViewChild(SymbolCreatorAiComponent) public symbolCreator: SymbolCreatorAiComponent;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: SymbolCreatorAIDialogData,
    public dialogRef: MatDialogRef<SymbolCreatorAIDialogComponent>) {
    if (data.media) { this.media = data.media; }
    if (data.preloadedImageData) { 
      this.preloadedImageData = data.preloadedImageData;
      console.log('[SymbolCreatorAIDialog] Received preloaded image data:', {
        hasFile: !!data.preloadedImageData.file,
        hasBase64: !!data.preloadedImageData.base64,
        filename: data.preloadedImageData.file?.name
      });
    }
  }

  saveAndClose() {
    this.symbolCreator.save().subscribe(media => this.dialogRef.close(media), error => null);
  }

  goBack() {
    this.symbolCreator.goBackToDefault();
  }

  /**
   * Safe getter to avoid change detection errors
   * Always returns a boolean to prevent undefined/false transitions
   */
  get shouldShowHeader(): boolean {
    // Explicitly return false if symbolCreator doesn't exist or currentMode is falsy
    // This prevents undefined → false transitions that cause change detection errors
    if (!this.symbolCreator || !this.symbolCreator.currentMode) {
      return false;
    }
    return true;
  }
}