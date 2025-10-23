import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-ai-image-actions',
  templateUrl: './ai-image-actions.component.html',
  styleUrls: ['./ai-image-actions.component.scss']
})
export class AiImageActionsComponent {
  @Input() selectedImageUrl: string = '';
  @Input() canSave: boolean = true;

  @Output() saveRequested = new EventEmitter<void>();
  @Output() downloadRequested = new EventEmitter<void>();
  @Output() importToDesignerRequested = new EventEmitter<void>();
  @Output() closeRequested = new EventEmitter<void>();

  onSave() {
    this.saveRequested.emit();
  }

  onDownload() {
    this.downloadRequested.emit();
  }

  onImportToDesigner() {
    this.importToDesignerRequested.emit();
  }

  onClose() {
    this.closeRequested.emit();
  }
}