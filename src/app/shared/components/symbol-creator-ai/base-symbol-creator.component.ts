import { Component, EventEmitter, Output } from '@angular/core';

// Style configuration interface (extracted from both components)
export interface StyleConfig {
  background: boolean;
  outlineWidth: number;
  saturation: string;
}

@Component({
  template: ''  // Abstract component with no template
})
export abstract class BaseSymbolCreatorComponent {
  @Output() saveRequested = new EventEmitter<string>();

  // Style management system (identical in both child components)
  selectedStyle: string = 'Mulberry';
  additionalText: string = '';
  backgroundEnabled: boolean = true;
  outlinesEnabled: boolean = true;
  
  public availableStyles: string[] = [];
  
  private styleConfigs: Record<string, StyleConfig> = {
    'Mulberry': { background: false, outlineWidth: 7, saturation: 'bold' },
    'Jellow': { background: true, outlineWidth: 5, saturation: 'bold' },
    'Tawasol': { background: true, outlineWidth: 4, saturation: 'bold' },
    'ARASAAC': { background: true, outlineWidth: 4, saturation: 'bold' },
    'Dyvogra': { background: true, outlineWidth: 2, saturation: 'soft' },
  };
  
  protected outlineWidth: number = 7;
  protected saturation: string = 'bold';

  // Initialize the style system (call from child ngOnInit)
  protected initializeStyles() {
    this.availableStyles = Object.keys(this.styleConfigs);
    this.updateFromConfig();
  }

  // Update component properties based on selected style configuration
  protected updateFromConfig() {
    const config = this.styleConfigs[this.selectedStyle];
    if (config) {
      this.backgroundEnabled = config.background;
      this.outlinesEnabled = true;
      this.outlineWidth = config.outlineWidth;
      this.saturation = config.saturation;
    } else {
      // Fallback defaults
      this.backgroundEnabled = true;
      this.outlinesEnabled = true;
      this.outlineWidth = 2;
      this.saturation = 'bold';
    }
  }

  // Style change handler (common logic)
  onStyleChange(newStyle: string) {
    this.selectedStyle = newStyle;
    this.updateFromConfig();
    // Child components can override this method to add additional logic
  }
}