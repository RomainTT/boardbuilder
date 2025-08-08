import {Component, Inject, ViewChild, Input} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {Media} from '@data/models/media.model';
import {SymbolCreatorAiComponent } from '../symbol-creator-ai/symbol-creator-ai.component';

export interface SymbolCreatorAIDialogData {
  media?: Media;
  
}

@Component({
  selector: 'app-symbol-creator-ai-dialog',
  templateUrl: './symbol-creator-ai-dialog.component.html',
  styleUrls: ['./symbol-creator-ai-dialog.component.scss']
})
export class SymbolCreatorAIDialogComponent {
  media: Media;
  @Input() parentDialogRef?: MatDialogRef<any>; // Add this to receive the parent dialog reference

  @ViewChild(SymbolCreatorAiComponent) public symbolCreator: SymbolCreatorAiComponent;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: SymbolCreatorAIDialogData,
    public dialogRef: MatDialogRef<SymbolCreatorAIDialogComponent>) {
    if (data.media) { this.media = data.media; }
  }

  saveAndClose() {
    this.symbolCreator.save().subscribe(media => this.dialogRef.close(media), error => null);
  }

  goBack() {
    this.symbolCreator.goBackToDefault();
  }
}