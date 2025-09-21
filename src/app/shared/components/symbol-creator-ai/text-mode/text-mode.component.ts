import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { AnimationEvent } from '@angular/animations';
import { HttpClient } from '@angular/common/http';
import { HotkeysService, Hotkey } from '@conflito/angular2-hotkeys';
import { DialogService } from '@app/services/dialog.service';
import { SymbolCreatorDialogData } from '@shared/components/symbol-creator-dialog/symbol-creator-dialog.component';
import { MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { AiSymbolHttpService } from '@data/services/ai-symbol-http.service';
import { AiSymbolStateService, StyleConfig } from '@data/services/ai-symbol-state.service';
import { BaseAiSymbolGeneratorComponent } from '../base-ai-symbol-generator.component';
import { AiGenerationParams, PromptOptions } from '@data/models/ai-symbol.interfaces';
import { PromptBuilderService } from '@shared/services/prompt-builder.service';

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

  // Text-mode specific properties
  private minSpinnerTime = 600;

  // Prompt-specific loading states
  isFirstGeneration: boolean = true;


  trackByIndex(index: number, item: any): number {
    return index;
  }

  constructor(
    private http: HttpClient,
    hotkeysService: HotkeysService,
    private dialogService: DialogService,
    aiSymbolHttpService: AiSymbolHttpService,
    stateService: AiSymbolStateService,
    private promptBuilder: PromptBuilderService
  ) {
    super(aiSymbolHttpService, stateService, hotkeysService);
  }

  ngOnInit() {
    this.prompt = this.initialPrompt;
  }

  // Override generateImages from base class
  generateImages() {
    this.onSubmit();
  }

  onSubmit() {
    // Guard against concurrent generations
    if (this.stateService.currentGalleryState.isLoading) {
      return;
    }
    const isRefresh = !this.isFirstGeneration;
    const minTime = isRefresh ? this.minSpinnerTime : 0;
    const startTime = Date.now();

    // Clear any previous errors
    this.stateService.clearApiError();

    // Update state via service
    this.stateService.setLoading(true);
    // Keep placeholders visible during loading just like initial request
    this.stateService.setRefreshing(false);
    this.stateService.clearSelection();
    // Do not hide images-row on refresh; leave showImages unchanged so placeholders remain visible
    this.generationId++;

    // Set empty images initially
    this.stateService.setGeneratedImages(Array(4).fill(''));

    // Build prompt using the UI state (styleState) and the style configuration (styleConfig) specified in the styleConfigs state
    const styleState = this.stateService.currentStyleState;
    const styleConfig = this.stateService.getStyleConfiguration(styleState.selectedStyle);

    // define the prompt options for injection into the buildPrompt() function
    const promptOptions: PromptOptions = {
      mode: 'text',
      userPrompt: this.prompt,
      styleState,
      styleConfig: styleConfig || undefined
    };

    this.fullPrompt = this.promptBuilder.buildPrompt(promptOptions);

    const params: AiGenerationParams = {
      prompt: this.fullPrompt,
      num_images: 4,
      steps: 4,
      loraAdapter: styleConfig?.loraAdapter
    };

    this.aiSymbolHttpService.generateImages(params)
      .subscribe(response => {
        this.stateService.setGeneratedImages(response.image_urls);
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
                // Symbol Creator dialog closed with media
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


  ngOnDestroy() {
    super.ngOnDestroy();
  }

}
