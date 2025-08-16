import { Component, Input, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { AnimationEvent } from '@angular/animations';
import { HttpClient } from '@angular/common/http';
import { HotkeysService, Hotkey } from '@conflito/angular2-hotkeys';
import { DialogService } from '@app/services/dialog.service';
import { SymbolCreatorDialogData } from '@shared/components/symbol-creator-dialog/symbol-creator-dialog.component';
import { MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { AiSymbolService } from '@data/services/ai-symbol.service';
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
export class TextModeComponent implements OnInit, OnDestroy {
  @Output() saveRequested = new EventEmitter<string>();
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

  // AI Controls (managed by child component)
  selectedStyle: string = 'Mulberry';
  additionalText: string = '';
  backgroundEnabled: boolean = true;
  availableStyles: string[] = ['Mulberry', 'Jellow', 'Tawasol', 'ARASAAC', 'Dyvogra'];

  // Gallery state management
  generatedImages: string[] = [];
  selectedImageIndex: number | null = null;
  isGenerated: boolean = false;
  showImages: boolean = false;
  isLoading: boolean = false;
  isRefreshing: boolean = false;

  // Rating state management
  rating: number = 0;
  promptAccuracy: number = 0;
  styleAccuracy: number = 0;
  showDetailedRatings: boolean = false;

  // API Error state management
  apiError: string | null = null;
  showApiError: boolean = false;

  trackByIndex(index: number, item: any): number {
    return index;
  }

  constructor(
    private http: HttpClient,
    private hotkeysService: HotkeysService,
    private dialogService: DialogService,
    private aiSymbolService: AiSymbolService
  ) {
    this.promptHotkey = new Hotkey('ctrl+p', (event: KeyboardEvent): boolean => {
      this.showPrompt = !this.showPrompt;
      return false;
    });
    this.hotkeysService.add(this.promptHotkey);
  }

  ngOnInit() {
    this.prompt = this.initialPrompt;
  }

  // AI Controls event handlers
  onStyleChanged(newStyle: string) {
    this.selectedStyle = newStyle;
  }

  onAdditionalTextChanged(newText: string) {
    this.additionalText = newText;
  }

  onBackgroundEnabledChanged(enabled: boolean) {
    this.backgroundEnabled = enabled;
  }

  onGenerateClicked() {
    this.onSubmit();
  }

  // Common gallery methods
  selectImage(index: number) {
    this.selectedImageIndex = index;
    this.rating = 0;
    this.promptAccuracy = 0;
    this.styleAccuracy = 0;
    this.showDetailedRatings = false;
  }

  closeSelected() {
    this.selectedImageIndex = null;
    this.rating = 0;
    this.promptAccuracy = 0;
    this.styleAccuracy = 0;
    this.showDetailedRatings = false;
  }

  // Common rating methods
  setRating(value: number) {
    this.rating = value;
    if (value > 0) {
      this.showDetailedRatings = true;
    }
  }

  setPromptAccuracy(value: number) {
    this.promptAccuracy = value;
  }

  setStyleAccuracy(value: number) {
    this.styleAccuracy = value;
  }

  // Common getter
  get selectedImageUrl(): string {
    if (this.selectedImageIndex !== null && this.generatedImages[this.selectedImageIndex]) {
      return this.generatedImages[this.selectedImageIndex];
    }
    return '';
  }

  // Common action methods
  onSave() {
    if (this.selectedImageIndex !== null && this.generatedImages[this.selectedImageIndex]) {
      this.saveRequested.emit(this.generatedImages[this.selectedImageIndex]);
    } else {
      console.warn('No image selected for save');
    }
  }

  // Common error handling methods
  setApiError(message: string) {
    this.apiError = message;
    this.showApiError = true;
    this.isLoading = false;
    this.isRefreshing = false;
  }

  clearApiError() {
    this.apiError = null;
    this.showApiError = false;
  }

  // Common method for handling API failures in image generation
  handleApiError(error: any) {
    console.error('API error:', error);
    
    // Extract meaningful error message from different error types
    let errorMessage = 'Failed to generate images. Please try again.';
    if (error?.message) {
      errorMessage = error.message;
    } else if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error?.status) {
      errorMessage = `HTTP ${error.status}: ${error.statusText || 'Request failed'}`;
    }
    
    this.setApiError(errorMessage);
    // Show empty images as fallback (existing behavior)
    this.generatedImages = Array(4).fill('');
    this.isGenerated = true;
    if (this.showImages !== undefined) {
      this.showImages = true;
    }
  }

  onSubmit() {
    console.log('[TextModeComponent] onSubmit called, using AiSymbolService for generation');
    const isRefresh = !this.isFirstGeneration;
    const minTime = isRefresh ? this.minSpinnerTime : 0;
    const startTime = Date.now();

    // Clear any previous errors
    this.clearApiError();

    this.isLoading = true;
    this.isRefreshing = true;
    this.selectedImageIndex = null;
    this.rating = 0;
    this.promptAccuracy = 0;
    this.styleAccuracy = 0;
    this.showDetailedRatings = false;
    this.showImages = false;
    this.generationId++;

    this.generatedImages = Array(4).fill('');

    // Build prompt using service
    const promptOptions: PromptBuilderOptions = {
      basePrompt: this.prompt,
      style: this.selectedStyle,
      culture: this.additionalText,
      backgroundEnabled: this.backgroundEnabled,
      outlinesEnabled: true,
      outlineWidth: 7,
      saturation: 'bold'
    };

    this.fullPrompt = this.aiSymbolService.buildPrompt(promptOptions);

    const params: AiGenerationParams = {
      prompt: this.fullPrompt,
      num_images: 4,
      steps: 4
    };

    this.aiSymbolService.generateImages(params)
      .subscribe(response => {
        this.generatedImages = response.images;
        this.isGenerated = true;
        if (!this.isFirstGeneration) {
          this.showImages = true;
        }
        this.isFirstGeneration = false;

        const elapsed = Date.now() - startTime;
        const remaining = minTime - elapsed;
        if (remaining > 0) {
          setTimeout(() => {
            this.isLoading = false;
            this.isRefreshing = false;
          }, remaining);
        } else {
          this.isLoading = false;
          this.isRefreshing = false;
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
      this.showImages = true;
    }
  }

  downloadPng() {
    console.log('[TextModeComponent] downloadPng called, using service directly');
    if (this.selectedImageIndex === null || !this.generatedImages[this.selectedImageIndex]) {
      console.warn('No image selected for download');
      return;
    }

    const imageUrl = this.generatedImages[this.selectedImageIndex];
    const filename = this.aiSymbolService.generateFilename(this.fullPrompt, this.selectedStyle);

    this.aiSymbolService.performDownload(imageUrl, filename)
      .subscribe({
        next: () => {
          // Download handled by service
        },
        error: (error) => {
          console.error('Error downloading PNG:', error);
        }
      });
  }

  importToDesigner() {
    if (this.selectedImageIndex === null || !this.generatedImages[this.selectedImageIndex]) {
      console.warn('No image selected for editing');
      return;
    }

    const imageUrl = this.generatedImages[this.selectedImageIndex];
    const filename = this.aiSymbolService.generateFilename(this.fullPrompt, this.selectedStyle);

    this.aiSymbolService.downloadImage(imageUrl, filename).subscribe(
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
  }

}
