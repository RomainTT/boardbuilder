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
import { ScaiAnalyticsService } from '@shared/services/scai-analytics.service';
import { ErrorMessageService } from '@shared/services/error-message.service';
import { MediaUpdateService } from '@data/services/media-update.service';

@Component({
  selector: 'app-text-mode',
  templateUrl: './text-mode.component.html',
  styleUrls: ['./text-mode.component.scss']
})
export class TextModeComponent extends BaseAiSymbolGeneratorComponent implements OnInit, OnDestroy {
  @Input() initialPrompt: string = '';
  @Input() parentDialogRef?: MatDialogRef<any>;
  @Input() accessPoint?: 'media' | 'boardset';

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
    private promptBuilder: PromptBuilderService,
    analytics: ScaiAnalyticsService,
    errorMessageService: ErrorMessageService,
    private mediaUpdateService: MediaUpdateService
  ) {
    super(aiSymbolHttpService, stateService, hotkeysService, analytics, errorMessageService);
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

    // Start both prompt logging and image generation in parallel for minimal delay
    const sessionId = this.analytics.currentSessionId || 0;
    if (sessionId) {
      const styleState = this.stateService.currentStyleState;
      this.analytics.createPrompt({
        session_id: sessionId,
        user_input: this.prompt,
        full_prompt: this.fullPrompt,
        style: styleState.selectedStyle,
        culture: styleState.cultureText || undefined
      }).subscribe();
    }

    this.aiSymbolHttpService.generateImages(params)
      .subscribe(response => {
        this.stateService.setGeneratedImages(response.image_urls);
        // Log generated images with prompt id
        const promptId = this.analytics.lastPromptId || 0;
        const sessionId = this.analytics.currentSessionId || 0;
        if (promptId && sessionId) {
          response.image_urls.forEach((url, idx) => {
            this.analytics.createGeneratedImage({
              prompt_id: promptId,
              image_url: url,
              position: idx + 1,
              session_id: sessionId
            }).subscribe();
          });
        }
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
        // Always log error to analytics with session_id for consistent reporting
        const sessionId = this.analytics.currentSessionId || undefined;

        if (sessionId) {
          this.analytics.createError({
            session_id: sessionId,
            http_code: error.status?.toString(),
            description: error.error?.detail || error.message || 'Image generation failed'
          }).subscribe();
        }

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

  public onExpandDone(event: AnimationEvent): void {
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
    const mappedId = this.analytics?.getImageIdForUrl(imageUrl);
    const imageId = mappedId ?? (galleryState.selectedImageIndex + 1);
    if (imageId) {
      this.analytics?.createAction({ image_id: imageId, action_type: 'send to designer' }).subscribe();
    }
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
                // Symbol Creator dialog closed with media - trigger update for cell assignment
                this.mediaUpdateService.triggerUpdate(mediaItem);
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

  onRemoveBackground(): void {
    super.onRemoveBackground();
  }

  onExamplesClicked(): void {
    if (this.parentDialogRef) {
      // Access the dialog component and open the examples modal
      const dialogComponent = this.parentDialogRef.componentInstance;
      if (dialogComponent && typeof dialogComponent.openExamplesModal === 'function') {
        dialogComponent.openExamplesModal();
      }
    }
  }

  ngOnDestroy() {
    super.ngOnDestroy();
  }

}
