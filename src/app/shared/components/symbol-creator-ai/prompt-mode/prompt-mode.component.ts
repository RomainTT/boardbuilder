import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { trigger, transition, style, animate, AnimationEvent } from '@angular/animations';
import { HttpClient } from '@angular/common/http';
import { HotkeysService, Hotkey } from '@conflito/angular2-hotkeys';
import { DialogService } from '@app/services/dialog.service';
import { SymbolCreatorDialogData } from '@shared/components/symbol-creator-dialog/symbol-creator-dialog.component';
import { MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { BaseSymbolCreatorComponent } from '../base-symbol-creator.component';
import { AiSymbolService } from '@data/services/ai-symbol.service';
import { AiGenerationParams, PromptBuilderOptions } from '@data/models/ai-symbol.interfaces';

@Component({
  selector: 'app-prompt-mode',
  templateUrl: './prompt-mode.component.html',
  styleUrls: ['./prompt-mode.component.scss'],
  animations: [
    trigger('expand', [
      transition(':enter', [
        style({ height: '0px', overflow: 'hidden' }),
        animate('800ms cubic-bezier(0.4, 0.0, 0.2, 1)', style({ height: '170px', overflow: 'visible' })),
      ]),
    ]),
    trigger('expandSelected', [
      transition(':enter', [
        style({ maxHeight: '0px', overflow: 'hidden' }),
        animate('800ms cubic-bezier(0.4, 0.0, 0.2, 1)', style({ maxHeight: '600px', overflow: 'visible' })),
      ]),
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('600ms ease-in', style({ opacity: 1 })),
      ]),
    ]),
    trigger('fadeInDetailed', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('600ms ease-in', style({ opacity: 1 })),
      ]),
    ]),
  ]
})
export class PromptModeComponent extends BaseSymbolCreatorComponent implements OnInit, OnDestroy {
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
    private aiSymbolServicePrivate: AiSymbolService
  ) {
    super(); // Required call to parent constructor
    this.aiSymbolService = this.aiSymbolServicePrivate; // Set service in base class
    
    this.promptHotkey = new Hotkey('ctrl+p', (event: KeyboardEvent): boolean => {
      this.showPrompt = !this.showPrompt;
      return false;
    });
    this.hotkeysService.add(this.promptHotkey);
  }

  ngOnInit() {
    this.prompt = this.initialPrompt;
    
    // Initialize styles using base class method  
    this.initializeStyles();
    this.selectedStyle = this.availableStyles[0];  // Default to 'Mulberry'
  }

  onSubmit() {
    console.log('[PromptModeComponent] onSubmit called, using AiSymbolService for generation');
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
      outlinesEnabled: this.outlinesEnabled,
      outlineWidth: this.outlineWidth,
      saturation: this.saturation
    };
    
    this.fullPrompt = this.aiSymbolServicePrivate.buildPrompt(promptOptions);

    const params: AiGenerationParams = {
      prompt: this.fullPrompt,
      num_images: 4,
      steps: 4
    };

    this.aiSymbolServicePrivate.generateImages(params)
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
    console.log('[PromptModeComponent] downloadPng called, using service via base class');
    this.performDownload(this.fullPrompt);
  }

  importToDesigner() {
    if (this.selectedImageIndex === null || !this.generatedImages[this.selectedImageIndex]) {
      console.warn('No image selected for editing');
      return;
    }

    const imageUrl = this.generatedImages[this.selectedImageIndex];
    const filename = this.aiSymbolService.generateFilename(this.fullPrompt, this.selectedStyle);
    
    this.aiSymbolServicePrivate.downloadImage(imageUrl, filename).subscribe(
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