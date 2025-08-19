import {Injectable} from '@angular/core';
import {MatDialog, MatDialogRef, MatDialogConfig} from '@angular/material/dialog';
import {Media} from '@data/models/media.model';
import {SymbolCreatorDialogComponent} from '@shared/components/symbol-creator-dialog/symbol-creator-dialog.component';
import {SymbolCreatorAIDialogComponent} from '@shared/components/symbol-creator-ai-dialog/symbol-creator-ai-dialog.component';
import {
  AddSymbolDialogComponent,
  AddSymbolDialogData,
  addSymbolDialogDataDefault
} from '@shared/components/add-symbol-dialog/add-symbol-dialog.component';
import {ConfirmDialogComponent, ConfirmDialogData} from '@shared/components/confirm-dialog/confirm-dialog.component';
import {ObzUploadDialogComponent} from '../../obz-upload-dialog/obz-upload-dialog.component';
import {BoardSet} from '@data/models/boardset.model';
import { ImageActionDialogComponent, ImageActionDialogData } from '@shared/components/image-action-dialog/image-action-dialog.component';
import { SymbolSearchResult } from '@data/models/symbol-search-result';
import { SearchResultConverterService } from '@shared/services/search-result-converter.service';

interface BasicDialogData {
  heading: string;
  content: string;
}

interface ErrorDialogData {
  heading?: string;
  content: string;
  detail?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DialogService {

  currentDialog: MatDialogRef<any>;

  constructor(
    private dialog: MatDialog,
    private searchResultConverter: SearchResultConverterService
  ) { }

  messageBox(data: ConfirmDialogData): MatDialogRef<ConfirmDialogComponent> {
    this.currentDialog = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data
    });
    return this.currentDialog;
  }

  openSymbolCreator(config?: MatDialogConfig): MatDialogRef<SymbolCreatorDialogComponent> {
    const defaultConfig: MatDialogConfig = {
      width: '800px',
      data: {} // Default empty data object
    };
    this.currentDialog = this.dialog.open(SymbolCreatorDialogComponent, {
      ...defaultConfig,
      ...config // Merge provided config with defaults
    });
    return this.currentDialog;
  }

  openSymbolCreatorAI(media?: Media): MatDialogRef<SymbolCreatorAIDialogComponent> {
    console.log('[DialogService] Opening Symbol Creator AI:', {
      mediaProvided: !!media,
      mediaId: media?.id,
      mediaUrl: media?.public_url,
      mediaData: media
    });

    this.currentDialog = this.dialog.open(SymbolCreatorAIDialogComponent, {
      width: '800px',
      data: {media}
    });

    return this.currentDialog;
  }

  /**
   * Opens the ImageActionDialog for users to choose what to do with a search result image
   * @param result - The search result containing image and metadata
   * @returns MatDialogRef that resolves with the chosen ImageAction or undefined if cancelled
   */
  openImageActionDialog(result: SymbolSearchResult): MatDialogRef<ImageActionDialogComponent> {
    console.log('[DialogService] Opening Image Action Dialog for result:', result.label);

    const dialogData: ImageActionDialogData = { result };

    this.currentDialog = this.dialog.open(ImageActionDialogComponent, {
      maxWidth: '95vw',
      width: 'auto',
      data: dialogData
    });

    return this.currentDialog;
  }

  /**
   * Opens the Symbol Creator AI with a pre-loaded image from a search result
   * Converts the search result image to the format expected by the AI component
   * @param result - The search result containing the image to pre-load
   * @returns MatDialogRef for the AI dialog
   */
  async openSymbolCreatorAIWithImage(result: SymbolSearchResult): Promise<MatDialogRef<SymbolCreatorAIDialogComponent>> {
    console.log('[DialogService] Opening Symbol Creator AI with pre-loaded image:', {
      resultId: result.id,
      label: result.label,
      imageUrl: result.imageUrl
    });

    try {
      console.log('[DialogService] Converting search result to image upload format...');

      // Convert the search result to ImageUploadResult format
      const imageUploadResult = await this.searchResultConverter.convertToImageUploadResult(result);

      console.log('[DialogService] Image conversion successful, opening AI dialog');

      // Open the AI dialog with the converted image data
      this.currentDialog = this.dialog.open(SymbolCreatorAIDialogComponent, {
        width: '800px',
        data: {
          preloadedImageData: imageUploadResult // Pass the converted image data
        }
      });

      // Set the preloaded image data on the component instance
      if (this.currentDialog.componentInstance) {
        this.currentDialog.componentInstance.preloadedImageData = imageUploadResult;
      }

      return this.currentDialog;

    } catch (error) {
      console.error('[DialogService] Failed to convert image for AI dialog:', error);

      // Fallback: open regular AI dialog without pre-loaded image
      console.log('[DialogService] Falling back to regular AI dialog');
      this.currentDialog = this.dialog.open(SymbolCreatorAIDialogComponent, {
        width: '800px',
        data: { error: 'Failed to load image: ' + error.message }
      });

      return this.currentDialog;
    }
  }

  openMediaLibrary(data: AddSymbolDialogData = addSymbolDialogDataDefault): MatDialogRef<AddSymbolDialogComponent> {
    this.currentDialog = this.dialog.open(AddSymbolDialogComponent, {
      width: '400px',
      data
    });

    return this.currentDialog;
  }

  error(errorData: ErrorDialogData): MatDialogRef<ConfirmDialogComponent> {
    const data: ConfirmDialogData = {
      heading: 'Something went wrong',
      ...errorData,
      icon: 'error',
      confirm: 'Continue',
    };
    this.currentDialog = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data
    });
    return this.currentDialog;
  }

  delete(deleteData: BasicDialogData): MatDialogRef<ConfirmDialogComponent> {
    const data: ConfirmDialogData = {
      ...deleteData,
      icon: 'delete',
      confirm: 'Delete',
      showCancel: true
    };
    this.currentDialog = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data
    });
    return this.currentDialog;
  }

  deleteBoardSet(boardSet: BoardSet, data: BasicDialogData): MatDialogRef<ConfirmDialogComponent> {
    if (boardSet.readonly) { return; }
    return this.delete(data);
  }

  uploadObz(): MatDialogRef<ObzUploadDialogComponent> {
    this.currentDialog = this.dialog.open(ObzUploadDialogComponent, {
      width: '500px'
    });

    return this.currentDialog;
  }
}
