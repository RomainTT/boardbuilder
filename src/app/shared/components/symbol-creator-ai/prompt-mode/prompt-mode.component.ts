import { Component, EventEmitter, Input, OnInit, Output, OnDestroy } from '@angular/core';
import { trigger, transition, style, animate, AnimationEvent } from '@angular/animations';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env';
import { HotkeysService, Hotkey } from '@conflito/angular2-hotkeys';
import { ImageBase64Service } from '@data/services/image-base64.service';
import { DialogService } from '@app/services/dialog.service';
import { SymbolCreatorDialogData } from '@shared/components/symbol-creator-dialog/symbol-creator-dialog.component';
import { MatDialogConfig, MatDialogRef } from '@angular/material/dialog';

// Define the interface here
interface StyleConfig {
  background: boolean;
  outlineWidth: number;
  saturation: string;
}

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
export class PromptModeComponent implements OnInit, OnDestroy {
  @Input() initialPrompt: string = '';
  @Output() saveRequested = new EventEmitter<string>();
  @Input() parentDialogRef?: MatDialogRef<any>;

  prompt: string = '';
  additionalText: string = '';
  backgroundEnabled: boolean = true;
  outlinesEnabled: boolean = true;

  isGenerated: boolean = false;
  showImages: boolean = false;
  generatedImages: string[] = [];
  generationId: number = 0;

  selectedImageIndex: number | null = null;
  rating: number = 0;
  promptAccuracy: number = 0;
  styleAccuracy: number = 0;
  showDetailedRatings: boolean = false;

  fullPrompt: string = '';
  showPrompt: boolean = false;
  private promptHotkey: Hotkey | null = null;
  private minSpinnerTime = 600;

  isLoading: boolean = false;
  isRefreshing: boolean = false;
  isFirstGeneration: boolean = true;

  public availableStyles: string[] = [];

  private styleConfigs: Record<string, StyleConfig> = {
    'Mulberry': { background: false, outlineWidth: 7, saturation: 'bold' },
    'Jellow': { background: true, outlineWidth: 5, saturation: 'bold' },
    'Tawasol': { background: true, outlineWidth: 4, saturation: 'bold' },
    'ARASAAC': { background: true, outlineWidth: 4, saturation: 'bold' },
    'Dyvogra': { background: true, outlineWidth: 2, saturation: 'soft' },
  };

  private _selectedStyle: string = '';  // Backing field for selectedStyle

  private outlineWidth: number = 7;  // Initial default (will be updated)
  private saturation: string = 'bold';  // Initial default (will be updated)

  // Define getter and setter for selectedStyle
  get selectedStyle(): string {
    return this._selectedStyle;
  }

  set selectedStyle(value: string) {
    this._selectedStyle = value;
    this.updateFromConfig();
  }

  get selectedImageUrl(): string {
    if (this.selectedImageIndex !== null && this.generatedImages[this.selectedImageIndex]) {
      return this.generatedImages[this.selectedImageIndex];
    }
    return '';
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }

  constructor(
    private http: HttpClient,
    private hotkeysService: HotkeysService,
    private imageBase64Service: ImageBase64Service,
    private dialogService: DialogService
  ) {
    this.promptHotkey = new Hotkey('ctrl+p', (event: KeyboardEvent): boolean => {
      this.showPrompt = !this.showPrompt;
      return false;
    });
    this.hotkeysService.add(this.promptHotkey);
  }

  ngOnInit() {
    this.prompt = this.initialPrompt;
    this.availableStyles = Object.keys(this.styleConfigs);
    this.selectedStyle = this.availableStyles[0];  // Default to 'Mulberry'
    this.updateFromConfig();
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

  setRating(value: number) {
    this.rating = value;
    console.log('Overall rated ' + value + ' stars for image index: ' + this.selectedImageIndex);
    if (value > 0) {
      this.showDetailedRatings = true;
    }
  }

  setPromptAccuracy(value: number) {
    this.promptAccuracy = value;
    console.log('Prompt Accuracy rated ' + value + ' stars for image index: ' + this.selectedImageIndex);
  }

  setStyleAccuracy(value: number) {
    this.styleAccuracy = value;
    console.log('Style Accuracy rated ' + value + ' stars for image index: ' + this.selectedImageIndex);
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

  private updateFromConfig() {
    const config = this.styleConfigs[this.selectedStyle];
    if (config) {
      this.backgroundEnabled = config.background;
      this.outlinesEnabled = true;
      this.outlineWidth = config.outlineWidth;
      this.saturation = config.saturation;
    } else {
      this.backgroundEnabled = true;
      this.outlinesEnabled = true;
      this.outlineWidth = 2;
      this.saturation = 'bold';
    }
  }
}