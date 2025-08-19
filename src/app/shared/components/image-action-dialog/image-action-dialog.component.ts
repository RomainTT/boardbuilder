/**
 * ImageActionDialog Component
 * 
 * This component displays a dialog that allows users to choose what to do with a selected 
 * search result image. It provides two main actions:
 * 1. "Use as-is" - directly populate a board cell with the selected image
 * 2. "Send to AI Designer" - open the AI symbol creator with the image pre-loaded for processing
 * 
 * The dialog shows a preview of the selected image along with its label and source information
 * to help users make an informed decision about how they want to use the image.
 * 
 * Usage:
 * - Opened from SearchPanelComponent when user clicks on a search result image
 * - Returns ImageAction enum value indicating user's choice
 * - Integrates with existing board editing and AI symbol creation workflows
 */

import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SymbolSearchResult } from '@data/models/symbol-search-result';

/**
 * Enum defining the possible actions a user can take with a selected search result image
 */
export enum ImageAction {
  /** Use the image directly to populate a board cell without modification */
  USE_AS_IS = 'use-as-is',
  /** Send the image to the AI Designer for processing and variation generation */
  SEND_TO_AI = 'send-to-ai'
}

/**
 * Interface defining the data structure passed to the ImageActionDialog
 */
export interface ImageActionDialogData {
  /** The search result containing image URL, label, and metadata */
  result: SymbolSearchResult;
}

@Component({
  selector: 'app-image-action-dialog',
  templateUrl: './image-action-dialog.component.html',
  styleUrls: ['./image-action-dialog.component.scss']
})
export class ImageActionDialogComponent implements OnInit {

  ImageAction = ImageAction;

  constructor(
    public dialogRef: MatDialogRef<ImageActionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ImageActionDialogData
  ) { }

  ngOnInit(): void {
    console.log('[ImageActionDialog] Initialized with result:', {
      id: this.data.result.id,
      label: this.data.result.label,
      imageUrl: this.data.result.imageUrl
    });
  }

  /**
   * Handles user selection of an action and closes the dialog with the selected action
   * @param action - The ImageAction chosen by the user
   */
  selectAction(action: ImageAction): void {
    console.log('[ImageActionDialog] Action selected:', action);
    this.dialogRef.close(action);
  }

  /**
   * Handles dialog cancellation - closes the dialog without returning any action
   */
  cancel(): void {
    console.log('[ImageActionDialog] Dialog cancelled');
    this.dialogRef.close();
  }
}
