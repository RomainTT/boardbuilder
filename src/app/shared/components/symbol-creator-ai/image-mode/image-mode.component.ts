import { Component, Input, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { AnimationEvent } from '@angular/animations';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ImageUploadResult } from '../../image-upload-dialog/image-upload-dialog.component';
import { AiSymbolHttpService } from '@data/services/ai-symbol-http.service';
import { AiSymbolStateService, StyleConfig } from '@data/services/ai-symbol-state.service';
import { BaseAiSymbolGeneratorComponent } from '../base-ai-symbol-generator.component';
import { AiImageToImageParams, PromptOptions } from '@data/models/ai-symbol.interfaces';
import { MatDialogRef, MatDialogConfig } from '@angular/material/dialog';
import { HotkeysService } from '@conflito/angular2-hotkeys';
import { DialogService } from '@app/services/dialog.service';
import { SymbolCreatorDialogData } from '@shared/components/symbol-creator-dialog/symbol-creator-dialog.component';
import { PromptBuilderService } from '@shared/services/prompt-builder.service';

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

  protected outlineWidth: number = 7;
  protected saturation: string = 'bold';

  constructor(
    aiSymbolHttpService: AiSymbolHttpService,
    stateService: AiSymbolStateService,
    hotkeysService: HotkeysService,
    private sanitizer: DomSanitizer,
    private dialogService: DialogService,
    private promptBuilder: PromptBuilderService
  ) {
    super(aiSymbolHttpService, stateService, hotkeysService);
  }

  ngOnInit() {
    // Component ready - user can upload image and configure settings
  }

  // Image upload handling
  onImageUploaded(result: ImageUploadResult) {
    this.uploadedImageData = result;

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
    // Guard against concurrent generations
    if (this.stateService.currentGalleryState.isLoading) {
      return;
    }
    if (!this.uploadedImageData) {
      console.warn('[ImageModeComponent] No uploaded image data available');
      return;
    }

    const generationId = Date.now().toString(36);

    // Clear any previous errors and update state
    this.stateService.clearApiError();
    // Detect if we are refreshing existing images vs. first load
    const hadImages = this.stateService.currentGalleryState.generatedImages.some(img => !!img);
    this.stateService.setLoading(true);
    // Keep placeholders visible while loading to mimic initial request behavior
    this.stateService.setRefreshing(false);
    this.stateService.clearSelection();
    // Do not hide images-row on refresh; leave showImages as-is so placeholders stay visible

    // Set empty images initially
    this.stateService.setGeneratedImages(Array(4).fill(''));

    // Build prompt using service and current style state
    const styleState = this.stateService.currentStyleState;
    const styleConfig = this.stateService.getStyleConfiguration(styleState.selectedStyle);

    const promptOptions: PromptOptions = {
      mode: 'image',
      userPrompt: '',
      styleState,
      styleConfig: styleConfig || undefined
    };

    this.fullPrompt = this.promptBuilder.buildPrompt(promptOptions);

    // Build parameters for image-to-image generation
    const params: AiImageToImageParams = {
      image: this.uploadedImageData.base64,
      prompt: this.fullPrompt, // Use the built prompt
      num_images: 4,
      steps: 4
    };

    // Call the service to generate image variations
    this.aiSymbolHttpService.generateImageVariations(params)
      .subscribe({
        next: (response) => {
          this.stateService.setGeneratedImages(response.image_urls);
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
    return this.aiSymbolHttpService.generateFilename(this.fullPrompt, style);
  }

  importToDesigner() {
    const galleryState = this.stateService.currentGalleryState;
    const styleState = this.stateService.currentStyleState;

    if (galleryState.selectedImageIndex === null || !galleryState.generatedImages[galleryState.selectedImageIndex]) {
      console.warn('[ImageModeComponent] No image selected for import to designer');
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
