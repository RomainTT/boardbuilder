import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-ai-controls',
  templateUrl: './ai-controls.component.html',
  styleUrls: ['./ai-controls.component.scss']
})
export class AiControlsComponent {
  @Input() selectedStyle: string = '';
  @Input() availableStyles: string[] = [];
  @Input() additionalText: string = '';
  @Input() backgroundEnabled: boolean = true;
  @Input() showGenerateButton: boolean = true;
  @Input() generateButtonText: string = 'Generate';
  @Input() generateButtonDisabled: boolean = false;

  @Output() styleChanged = new EventEmitter<string>();
  @Output() additionalTextChanged = new EventEmitter<string>();
  @Output() backgroundEnabledChanged = new EventEmitter<boolean>();
  @Output() generateClicked = new EventEmitter<void>();
}