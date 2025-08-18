import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { AnimationEvent } from '@angular/animations';
import { HttpClient } from '@angular/common/http';
import { HotkeysService, Hotkey } from '@conflito/angular2-hotkeys';
import { DialogService } from '@app/services/dialog.service';
import { SymbolCreatorDialogData } from '@shared/components/symbol-creator-dialog/symbol-creator-dialog.component';
import { MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { AiSymbolHttpService } from '@data/services/ai-symbol-http.service';
import { AiSymbolStateService } from '@data/services/ai-symbol-state.service';
import { BaseAiSymbolGeneratorComponent } from '../base-ai-symbol-generator.component';
import { AiGenerationParams, PromptBuilderOptions } from '@data/models/ai-symbol.interfaces';

// Style configuration interface
export interface StyleConfig {
  background: boolean;
  outlineWidth: number;
  saturation: string;
}

@Component({
  selector: 'app-text-mode',
  templateUrl: './text-mode.component.html',
  styleUrls: ['./text-mode.component.scss']
})
export class TextModeComponent extends BaseAiSymbolGeneratorComponent implements OnInit, OnDestroy {
  @Input() initialPrompt: string = '';
  @Input() parentDialogRef?: MatDialogRef<any>;

  prompt: string = '';
  generationId: number = 0;

  // Prompt-specific properties
  fullPrompt: string = '';
  showPrompt: boolean = false;
  private promptHotkey: Hotkey | null = null;
  private minSpinnerTime = 600;

  // Prompt-specific loading states
  isFirstGeneration: boolean = true;


  trackByIndex(index: number, item: any): number {
    return index;
  }

  constructor(
    private http: HttpClient,
    private hotkeysService: HotkeysService,
    private dialogService: DialogService,
    aiSymbolHttpService: AiSymbolHttpService,
    stateService: AiSymbolStateService
  ) {
    super(aiSymbolHttpService, stateService);
    
    this.promptHotkey = new Hotkey('ctrl+p', (event: KeyboardEvent): boolean => {
      this.showPrompt = !this.showPrompt;
      return false;
    });
    this.hotkeysService.add(this.promptHotkey);
  }

  ngOnInit() {
    this.prompt = this.initialPrompt;
  }

  // Override generateImages from base class
  generateImages() {
    this.onSubmit();
  }

  onSubmit() {
    console.log('[TextModeComponent] Generating images from prompt:', this.prompt.substring(0, 50) + (this.prompt.length > 50 ? '...' : ''));
    const isRefresh = !this.isFirstGeneration;
    const minTime = isRefresh ? this.minSpinnerTime : 0;
    const startTime = Date.now();

    // Clear any previous errors
    this.stateService.clearApiError();

    // Update state via service
    this.stateService.setLoading(true);
    this.stateService.setRefreshing(true);
    this.stateService.clearSelection();
    this.stateService.setShowImages(false);
    this.generationId++;

    // Set empty images initially
    this.stateService.setGeneratedImages(Array(4).fill(''));

    // Build prompt using service and current style state
    const styleState = this.stateService.currentStyleState;
    const styleConfig = this.stateService.getStyleConfiguration(styleState.selectedStyle);
    
    const promptOptions: PromptBuilderOptions = {
      basePrompt: this.prompt,
      style: styleState.selectedStyle,
      culture: styleState.additionalText,
      backgroundEnabled: styleState.backgroundEnabled,
      outlinesEnabled: true,
      outlineWidth: styleConfig?.outlineWidth || 7,
      saturation: styleConfig?.saturation || 'bold'
    };

    this.fullPrompt = this.aiSymbolHttpService.buildPrompt(promptOptions);

    const params: AiGenerationParams = {
      prompt: this.fullPrompt,
      num_images: 4,
      steps: 4
    };

    this.aiSymbolHttpService.generateImages(params)
      .subscribe(response => {
        this.stateService.setGeneratedImages(response.images);
        if (!this.isFirstGeneration) {
          this.stateService.setShowImages(true);
        }
        this.isFirstGeneration = false;

        const elapsed = Date.now() - startTime;
        const remaining = minTime - elapsed;
        if (remaining > 0) {
          setTimeout(() => {
            this.stateService.setLoading(false);
            this.stateService.setRefreshing(false);
          }, remaining);
        } else {
          this.stateService.setLoading(false);
          this.stateService.setRefreshing(false);
        }
      }, error => {
        const elapsed = Date.now() - startTime;
        const remaining = minTime - elapsed;
        if (remaining > 0) {
          setTimeout(() => {
            this.handleApiError(error);
          }, remaining);
        } else {
          this.handleApiError(error);
        }
        this.isFirstGeneration = false;
      });
  }

  onExpandDone(event: AnimationEvent) {
    if (event.phaseName === 'done' && event.fromState === 'void') {
      this.stateService.setShowImages(true);
    }
  }

  // Override filename generation to use the full prompt
  protected generateDownloadFilename(style: string): string {
    return this.aiSymbolHttpService.generateFilename(this.fullPrompt, style);
  }

  importToDesigner() {
    const galleryState = this.stateService.currentGalleryState;
    const styleState = this.stateService.currentStyleState;
    
    if (galleryState.selectedImageIndex === null || !galleryState.generatedImages[galleryState.selectedImageIndex]) {
      console.warn('No image selected for editing');
      return;
    }

    const imageUrl = galleryState.generatedImages[galleryState.selectedImageIndex];
    const filename = this.aiSymbolHttpService.generateFilename(this.fullPrompt, styleState.selectedStyle);

    this.aiSymbolHttpService.downloadImage(imageUrl, filename).subscribe(
      (blob) => {
        if (!blob) {
          console.error('Failed to fetch image blob for editing');
          return;
        }

        if (this.parentDialogRef) {
          this.parentDialogRef.afterClosed().subscribe(() => {
            const dialogConfig: MatDialogConfig = {
              width: '800px',
              data: { blob } as SymbolCreatorDialogData,
            };
            const dialogRef = this.dialogService.openSymbolCreator(dialogConfig);
            dialogRef.afterClosed().subscribe((mediaItem) => {
              if (mediaItem) {
                console.log('Symbol Creator dialog closed with media:', mediaItem);
              }
            });
          });
          this.parentDialogRef.close();
        }
      },
      (error) => {
        console.error('Error fetching image for editing:', error);
      }
    );
  }


  copyPrompt() {
    if (this.fullPrompt) {
      navigator.clipboard.writeText(this.fullPrompt)
        .then(() => {
          console.log('Prompt copied to clipboard!');
        })
        .catch(err => {
          console.error('Failed to copy prompt:', err);
        });
    }
  }

  ngOnDestroy() {
    if (this.promptHotkey) {
      this.hotkeysService.remove(this.promptHotkey);
    }
    super.ngOnDestroy();
  }

}
