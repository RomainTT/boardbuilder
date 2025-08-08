import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-image-mode',
  templateUrl: './image-mode.component.html',
  styleUrls: ['./image-mode.component.scss']
})
export class ImageModeComponent {

  @Input() imageUrl: string = '';
  @Output() save = new EventEmitter<void>(); // Triggers parent save()

  onSave() {
    this.save.emit();
  }
}