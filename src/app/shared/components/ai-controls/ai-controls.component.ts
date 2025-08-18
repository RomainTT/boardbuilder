import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Observable } from 'rxjs';
import { AiSymbolStateService, StyleState } from '@data/services/ai-symbol-state.service';

@Component({
  selector: 'app-ai-controls',
  templateUrl: './ai-controls.component.html',
  styleUrls: ['./ai-controls.component.scss']
})
export class AiControlsComponent {
  @Input() showGenerateButton: boolean = true;
  @Input() generateButtonText: string = 'Generate';
  @Input() generateButtonDisabled: boolean = false;

  @Output() generateClicked = new EventEmitter<void>();

  // Access style state from service
  styleState$: Observable<StyleState> = this.stateService.styleState$;

  constructor(private stateService: AiSymbolStateService) {}

  // Event handlers that update the state service
  onStyleChanged(newStyle: string): void {
    this.stateService.setSelectedStyle(newStyle);
  }

  onAdditionalTextChanged(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.stateService.setAdditionalText(target.value);
  }

  onBackgroundEnabledChanged(enabled: boolean): void {
    this.stateService.setBackgroundEnabled(enabled);
  }
}