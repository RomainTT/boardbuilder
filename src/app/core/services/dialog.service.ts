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
    private dialog: MatDialog
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
    this.currentDialog = this.dialog.open(SymbolCreatorAIDialogComponent, {
      width: '800px',
      data: {media}
    });

    return this.currentDialog;
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
