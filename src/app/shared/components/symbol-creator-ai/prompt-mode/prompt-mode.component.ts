import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { trigger, transition, style, animate, AnimationEvent } from '@angular/animations';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env';
import { HotkeysService, Hotkey } from '@conflito/angular2-hotkeys';
import { ImageBase64Service } from '@data/services/image-base64.service';
import { DialogService } from '@app/services/dialog.service';
import { SymbolCreatorDialogData } from '@shared/components/symbol-creator-dialog/symbol-creator-dialog.component';
import { MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { BaseSymbolCreatorComponent } from '../base-symbol-creator.component';

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
    private imageBase64Service: ImageBase64Service,
    private dialogService: DialogService
  ) {
    super(); // Required call to parent constructor
    
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
    const isRefresh = !this.isFirstGeneration;
    const minTime = isRefresh ? this.minSpinnerTime : 0;
    const startTime = Date.now();

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

    this.fullPrompt = `${this.prompt} in ${this.selectedStyle} style` +
      (this.additionalText ? `, culture: ${this.additionalText}` : '') +
      `, ${this.backgroundEnabled ? 'with' : 'without'} a background` +
      `${this.outlinesEnabled ? `, using a ${this.outlineWidth}px outline` : ''}` +
      `, color saturation: ${this.saturation}`;

    const payload = {
      prompt: this.fullPrompt,
      num_images: 4,
      steps: 4
    };

    this.http.post<{ images: string[] }>(`${environment.scaAiApiBase}/api/symbols/generate`, payload)
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
        console.error('API error:', error);
        this.generatedImages = Array(4).fill('');
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
      });
  }

  onExpandDone(event: AnimationEvent) {
    if (event.phaseName === 'done' && event.fromState === 'void') {
      this.showImages = true;
    }
  }


  onSave() {
    if (this.selectedImageIndex !== null && this.generatedImages[this.selectedImageIndex]) {
      this.saveRequested.emit(this.generatedImages[this.selectedImageIndex]);
    } else {
      console.warn('No image selected for save');
    }
  }

  downloadPng() {
    if (this.selectedImageIndex === null || !this.generatedImages[this.selectedImageIndex]) {
      console.warn('No image selected for download');
      return;
    }

    const imageUrl = this.generatedImages[this.selectedImageIndex];

    this.http.get(imageUrl, { responseType: 'blob' }).subscribe(blob => {
      if (!blob) {
        console.error('Failed to fetch image blob');
        return;
      }

      const filename = this.generateFilename();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, error => {
      console.error('Error downloading PNG:', error);
    });
  }

  private generateFilename(): string {
    const timestamp = new Date().toISOString().replace(/[:\-T\.Z]/g, '').slice(0, 14);
    const sanitizedPrompt = this.fullPrompt.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    return `${sanitizedPrompt}_${this.selectedStyle.toLowerCase()}_${timestamp}.png`.toLowerCase();
  }

  importToDesigner() {
    if (this.selectedImageIndex === null || !this.generatedImages[this.selectedImageIndex]) {
      console.warn('No image selected for editing');
      return;
    }

    const imageUrl = this.generatedImages[this.selectedImageIndex];
    this.http.get(imageUrl, { responseType: 'blob' }).subscribe(
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