import { Component, Input, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { AnimationEvent } from '@angular/animations';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ImageUploadResult } from '../../image-upload-dialog/image-upload-dialog.component';
import { AiSymbolHttpService } from '@data/services/ai-symbol-http.service';
import { AiSymbolStateService } from '@data/services/ai-symbol-state.service';
import { BaseAiSymbolGeneratorComponent } from '../base-ai-symbol-generator.component';
import { AiImageToImageParams, PromptBuilderOptions } from '@data/models/ai-symbol.interfaces';
import { MatDialogRef } from '@angular/material/dialog';

// Style configuration interface
export interface StyleConfig {
  background: boolean;
  outlineWidth: number;
  saturation: string;
}

@Component({
  selector: 'app-image-mode',
  templateUrl: './image-mode.component.html',
  styleUrls: ['./image-mode.component.scss']
})
export class ImageModeComponent extends BaseAiSymbolGeneratorComponent implements OnInit, OnDestroy {
  @Input() uploadedImageData: ImageUploadResult | null = null;
  @Input() parentDialogRef?: MatDialogRef<any>;

  // Component-specific state only
  outlinesEnabled: boolean = true;
  
  private styleConfigs: Record<string, StyleConfig> = {
    'Mulberry': { background: false, outlineWidth: 7, saturation: 'bold' },
    'Jellow': { background: true, outlineWidth: 5, saturation: 'bold' },
    'Tawasol': { background: true, outlineWidth: 4, saturation: 'bold' },
    'ARASAAC': { background: true, outlineWidth: 4, saturation: 'bold' },
    'Dyvogra': { background: true, outlineWidth: 2, saturation: 'soft' },
  };
  
  protected outlineWidth: number = 7;
  protected saturation: string = 'bold';

  constructor(
    aiSymbolHttpService: AiSymbolHttpService,
    stateService: AiSymbolStateService,
    private sanitizer: DomSanitizer
  ) {
    super(aiSymbolHttpService, stateService);
  }

  ngOnInit() {
    // Component ready - user can upload image and configure settings
    console.log('[ImageMode] Component initialized - analyzing input requirements');
    console.log('[ImageMode] Expected uploadedImageData structure:', {
      example: {
        file: 'File object',
        base64: 'string - base64 encoded image data',
        preview: 'string - data URL for preview',
        width: 'number',
        height: 'number'
      }
    });
    
    if (this.uploadedImageData) {
      console.log('[ImageMode] Pre-loaded image data:', {
        filename: this.uploadedImageData.file?.name,
        hasBase64: !!this.uploadedImageData.base64,
        hasPreview: !!this.uploadedImageData.preview,
        dimensions: `${this.uploadedImageData.width}x${this.uploadedImageData.height}`
      });
    }
  }

  // Image upload handling
  onImageUploaded(result: ImageUploadResult) {
    this.uploadedImageData = result;
    console.log('[ImageModeComponent] Image uploaded:', {
      filename: result.file.name,
      dimensions: `${result.width}x${result.height}`,
      fileSize: `${(result.file.size / 1024).toFixed(1)}KB`
    });
    
    console.log('[ImageModeComponent] Full ImageUploadResult structure:', {
      file: result.file,
      base64: result.base64 ? `${result.base64.substring(0, 50)}...` : null,
      preview: result.preview ? `${result.preview.substring(0, 50)}...` : null,
      width: result.width,
      height: result.height,
      fullResult: result
    });
    
    console.log('[ImageModeComponent] Conversion requirements from SymbolSearchResult:');
    console.log('  - Need to fetch image from SymbolSearchResult.imageUrl');
    console.log('  - Convert to File object or Blob');
    console.log('  - Generate base64 encoding');
    console.log('  - Create preview data URL');
    console.log('  - Extract image dimensions');
    
    // Clear any previous generation results
    this.clearPreviousResults();
  }

  clearUploadedImage() {
    this.uploadedImageData = null;
    this.clearPreviousResults();
  }

  private clearPreviousResults() {
    this.stateService.clearGalleryState();
    this.stateService.clearApiError();
  }

  // Override generateImages from base class
  generateImages() {
    this.generateImageVariations();
  }

  // Generate image variations using AiSymbolHttpService
  generateImageVariations() {
    if (!this.uploadedImageData) {
      console.warn('[ImageModeComponent] No uploaded image data available');
      return;
    }

    const generationId = Date.now().toString(36);
    console.log('[ImageModeComponent] Generating variations from uploaded image:', this.uploadedImageData.file.name);
    
    // Clear any previous errors and update state
    this.stateService.clearApiError();
    this.stateService.setLoading(true);
    this.stateService.setRefreshing(true);
    this.stateService.clearSelection();
    this.stateService.setShowImages(false);

    // Set empty images initially
    this.stateService.setGeneratedImages(Array(4).fill(''));

    // Build prompt using service and current style state
    const styleState = this.stateService.currentStyleState;
    const styleConfig = this.stateService.getStyleConfiguration(styleState.selectedStyle);
    
    const promptOptions: PromptBuilderOptions = {
      basePrompt: 'symbol', // Default base prompt for image-to-image
      style: styleState.selectedStyle,
      culture: styleState.additionalText,
      backgroundEnabled: styleState.backgroundEnabled,
      outlinesEnabled: true,
      outlineWidth: styleConfig?.outlineWidth || 7,
      saturation: styleConfig?.saturation || 'bold'
    };
    
    const fullPrompt = this.aiSymbolHttpService.buildPrompt(promptOptions);
    console.log(`[ImageModeComponent] Built prompt [${generationId}]:`, fullPrompt);

    // Build parameters for image-to-image generation
    const params: AiImageToImageParams = {
      image: this.uploadedImageData.base64,
      prompt: fullPrompt, // Use the built prompt
      num_images: 4,
      steps: 4
    };

    // Call the service to generate image variations
    this.aiSymbolHttpService.generateImageVariations(params)
      .subscribe({
        next: (response) => {
          console.log(`[ImageModeComponent] ✓ Generation completed [${generationId}]:`, {
            imagesGenerated: response.images.length,
            firstImagePreview: response.images[0] ? `${response.images[0].substring(0, 50)}...` : 'none'
          });
          this.stateService.setGeneratedImages(response.images);
          this.stateService.setLoading(false);
          this.stateService.setRefreshing(false);
        },
        error: (error) => {
          console.error(`[ImageModeComponent] ✗ Generation failed [${generationId}]:`, error);
          this.handleApiError(error);
        }
      });
  }

  // Component-specific event handlers
  onExpandDone(event: AnimationEvent) {
    if (event.phaseName === 'done' && event.fromState === 'void') {
      this.stateService.setShowImages(true);
    }
  }

  // Override filename generation for image variations
  protected generateDownloadFilename(style: string): string {
    return this.aiSymbolHttpService.generateFilename('image_variation', style);
  }

  importToDesigner() {
    const galleryState = this.stateService.currentGalleryState;
    
    if (galleryState.selectedImageIndex === null || !galleryState.generatedImages[galleryState.selectedImageIndex]) {
      console.warn('[ImageModeComponent] No image selected for import to designer');
      return;
    }
    console.log('[ImageModeComponent] Importing generated image to designer');
    // TODO: Implement actual import to designer functionality
  }

  get originalImageUrl(): SafeUrl | string {
    if (this.uploadedImageData?.preview) {
      // Sanitize blob URLs to make them safe for Angular
      return this.sanitizer.bypassSecurityTrustUrl(this.uploadedImageData.preview);
    }
    return '';
  }

  ngOnDestroy() {
    super.ngOnDestroy();
  }
}