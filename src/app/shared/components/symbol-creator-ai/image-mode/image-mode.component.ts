import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { of, Observable } from 'rxjs';
import { delay } from 'rxjs/operators';
import { trigger, transition, style, animate, AnimationEvent } from '@angular/animations';
import { ImageUploadResult } from '../../image-upload-dialog/image-upload-dialog.component';

// Style configuration interface copied from prompt mode
interface StyleConfig {
  background: boolean;
  outlineWidth: number;
  saturation: string;
}

@Component({
  selector: 'app-image-mode',
  templateUrl: './image-mode.component.html',
  styleUrls: ['./image-mode.component.scss'],
  animations: [
    trigger('expandSelected', [
      transition(':enter', [
        style({ maxHeight: '0px', overflow: 'hidden' }),
        animate('800ms cubic-bezier(0.4, 0.0, 0.2, 1)', style({ maxHeight: '600px', overflow: 'visible' })),
      ]),
    ]),
  ]
})
export class ImageModeComponent implements OnInit {

  @Input() uploadedImageData: ImageUploadResult | null = null;
  @Input() selectedStyle: string = 'Mulberry';
  @Output() saveRequested = new EventEmitter<string>();

  // Culture field (added to match prompt-mode)
  additionalText: string = '';

  // Gallery states
  generatedImages: string[] = [];
  selectedImageIndex: number | null = null;
  isGenerated: boolean = false;
  showImages: boolean = false;
  isLoading: boolean = false;
  isRefreshing: boolean = false;

  // Rating states
  rating: number = 0;
  promptAccuracy: number = 0;
  styleAccuracy: number = 0;
  showDetailedRatings: boolean = false;

  // Style configurations copied from prompt mode
  public availableStyles: string[] = [];
  private styleConfigs: Record<string, StyleConfig> = {
    'Mulberry': { background: false, outlineWidth: 7, saturation: 'bold' },
    'Jellow': { background: true, outlineWidth: 5, saturation: 'bold' },
    'Tawasol': { background: true, outlineWidth: 4, saturation: 'bold' },
    'ARASAAC': { background: true, outlineWidth: 4, saturation: 'bold' },
    'Dyvogra': { background: true, outlineWidth: 2, saturation: 'soft' },
  };

  backgroundEnabled: boolean = true;
  outlinesEnabled: boolean = true;
  private outlineWidth: number = 7;
  private saturation: string = 'bold';

  ngOnInit() {
    this.availableStyles = Object.keys(this.styleConfigs);
    this.updateFromConfig();
    
    // Auto-generate variations when component loads with uploaded image
    if (this.uploadedImageData) {
      this.generateImageVariations();
    }
  }

  // Stubbed image-to-image generation method
  generateImageVariations() {
    if (!this.uploadedImageData) {
      console.warn('[ImageModeComponent] No uploaded image data available');
      return;
    }

    console.log(`[ImageModeComponent] POST ${this.uploadedImageData.base64.substring(0, 50)}... to /api/symbols/image-to-image`);
    console.log(`[ImageModeComponent] Style: ${this.selectedStyle}, Culture: ${this.additionalText}, Background: ${this.backgroundEnabled}, Outlines: ${this.outlinesEnabled}`);
    console.log(`[ImageModeComponent] Original image size: ${this.uploadedImageData.width}x${this.uploadedImageData.height}`);
    
    this.isLoading = true;
    this.isRefreshing = true;
    this.selectedImageIndex = null;
    this.rating = 0;
    this.promptAccuracy = 0;
    this.styleAccuracy = 0;
    this.showDetailedRatings = false;
    this.showImages = false;

    // Simulate API response with hardcoded images
    const mockApiResponse = {
      images: [
        'https://picsum.photos/400/400?random=1',
        'https://picsum.photos/400/400?random=2',
        'https://picsum.photos/400/400?random=3',
        'https://picsum.photos/400/400?random=4'
      ]
    };

    // Simulate API delay
    of(mockApiResponse).pipe(delay(1500)).subscribe(response => {
      console.log('[ImageModeComponent] Received stubbed API response:', response);
      this.generatedImages = response.images;
      this.isGenerated = true;
      this.isLoading = false;
      this.isRefreshing = false;
    });
  }

  // Gallery event handlers
  selectImage(index: number) {
    this.selectedImageIndex = index;
    this.rating = 0;
    this.promptAccuracy = 0;
    this.styleAccuracy = 0;
    this.showDetailedRatings = false;
  }

  onExpandDone(event: AnimationEvent) {
    if (event.phaseName === 'done' && event.fromState === 'void') {
      this.showImages = true;
    }
  }

  closeSelected() {
    this.selectedImageIndex = null;
    this.rating = 0;
    this.promptAccuracy = 0;
    this.styleAccuracy = 0;
    this.showDetailedRatings = false;
  }

  // Rating event handlers
  setRating(value: number) {
    this.rating = value;
    console.log(`[ImageModeComponent] Overall rated ${value} stars for image index: ${this.selectedImageIndex}`);
    if (value > 0) {
      this.showDetailedRatings = true;
    }
  }

  setPromptAccuracy(value: number) {
    this.promptAccuracy = value;
    console.log(`[ImageModeComponent] Prompt Accuracy rated ${value} stars for image index: ${this.selectedImageIndex}`);
  }

  setStyleAccuracy(value: number) {
    this.styleAccuracy = value;
    console.log(`[ImageModeComponent] Style Accuracy rated ${value} stars for image index: ${this.selectedImageIndex}`);
  }

  // Action handlers
  onSave() {
    if (this.selectedImageIndex !== null && this.generatedImages[this.selectedImageIndex]) {
      console.log(`[ImageModeComponent] Save requested for generated image: ${this.generatedImages[this.selectedImageIndex]}`);
      this.saveRequested.emit(this.generatedImages[this.selectedImageIndex]);
    } else {
      console.warn('[ImageModeComponent] No image selected for save');
    }
  }

  downloadPng() {
    if (this.selectedImageIndex === null || !this.generatedImages[this.selectedImageIndex]) {
      console.warn('[ImageModeComponent] No image selected for download');
      return;
    }
    console.log(`[ImageModeComponent] Download requested for: ${this.generatedImages[this.selectedImageIndex]}`);
    // TODO: Implement actual download functionality
  }

  importToDesigner() {
    if (this.selectedImageIndex === null || !this.generatedImages[this.selectedImageIndex]) {
      console.warn('[ImageModeComponent] No image selected for editing');
      return;
    }
    console.log(`[ImageModeComponent] Import to designer requested for: ${this.generatedImages[this.selectedImageIndex]}`);
    // TODO: Implement actual import to designer functionality
  }

  // Style management
  onStyleChange(newStyle: string) {
    this.selectedStyle = newStyle;
    this.updateFromConfig();
    if (this.uploadedImageData) {
      this.generateImageVariations();
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

  get selectedImageUrl(): string {
    if (this.selectedImageIndex !== null && this.generatedImages[this.selectedImageIndex]) {
      return this.generatedImages[this.selectedImageIndex];
    }
    return '';
  }

  get originalImageUrl(): string {
    return this.uploadedImageData?.preview || '';
  }
}