import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { of, Observable } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface ImageUploadDialogData {
  title?: string;
  acceptedTypes?: string[];
  maxSizeInMB?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface ImageUploadResult {
  file: File;
  base64: string;
  preview: string;
  width: number;
  height: number;
}

// Style configuration interface copied from image mode
interface StyleConfig {
  background: boolean;
  outlineWidth: number;
  saturation: string;
}

@Component({
  selector: 'app-image-upload-dialog',
  templateUrl: './image-upload-dialog.component.html',
  styleUrls: ['./image-upload-dialog.component.scss']
})
export class ImageUploadDialogComponent implements OnInit {
  isDragOver = false;
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  errorMessage: string | null = null;
  isLoading = false;
  
  // Default configuration
  title = 'Upload Image';
  acceptedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
  acceptedExtensions = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
  maxSizeInMB = 5;
  maxWidth = 2000;
  maxHeight = 2000;

  @Output() saveRequested = new EventEmitter<string>();

  // Style control properties (copied from ImageModeComponent)
  selectedStyle: string = 'Mulberry';
  additionalText: string = ''; // Culture field (copied from prompt-mode)
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

  // Gallery states (copied from ImageModeComponent)
  uploadedImageData: ImageUploadResult | null = null;
  generatedImages: string[] = [];
  selectedImageIndex: number | null = null;
  isGenerated: boolean = false;
  showImages: boolean = false;
  isRefreshing: boolean = false;

  // Rating states (copied from ImageModeComponent)
  rating: number = 0;
  promptAccuracy: number = 0;
  styleAccuracy: number = 0;
  showDetailedRatings: boolean = false;

  constructor() {}

  ngOnInit() {
    // Update accepted extensions based on accepted types
    this.acceptedExtensions = this.acceptedTypes.map(type => {
      switch (type) {
        case 'image/png': return '.png';
        case 'image/jpeg': return '.jpg';
        case 'image/jpg': return '.jpeg';
        case 'image/svg+xml': return '.svg';
        case 'image/webp': return '.webp';
        default: return '';
      }
    }).filter(ext => ext);

    // Initialize style controls
    this.availableStyles = Object.keys(this.styleConfigs);
    this.updateFromConfig();
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      this.handleFile(file);
    }
  }

  private handleFile(file: File) {
    this.errorMessage = null;
    
    // Validate file type
    if (!this.acceptedTypes.includes(file.type)) {
      this.errorMessage = `Invalid file type. Please select one of: ${this.acceptedExtensions.join(', ')}`;
      return;
    }

    // Validate file size
    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > this.maxSizeInMB) {
      this.errorMessage = `File size too large. Maximum allowed size is ${this.maxSizeInMB}MB.`;
      return;
    }

    this.selectedFile = file;
    this.createPreview(file);
  }

  private createPreview(file: File) {
    this.isLoading = true;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewUrl = e.target?.result as string;
      
      // For SVG files, we don't need to validate dimensions
      if (file.type === 'image/svg+xml') {
        this.autoProcessImage();
        this.isLoading = false;
        return;
      }
      
      // Create image element to check dimensions for raster images
      const img = new Image();
      img.onload = () => {
        if (img.width > this.maxWidth || img.height > this.maxHeight) {
          this.errorMessage = `Image dimensions too large. Maximum allowed size is ${this.maxWidth}x${this.maxHeight}px.`;
          this.selectedFile = null;
          this.previewUrl = null;
        } else {
          // Automatically process the image after validation
          this.autoProcessImage();
        }
        this.isLoading = false;
      };
      img.onerror = () => {
        this.errorMessage = 'Invalid image file.';
        this.selectedFile = null;
        this.previewUrl = null;
        this.isLoading = false;
      };
      img.src = this.previewUrl;
    };
    
    reader.onerror = () => {
      this.errorMessage = 'Error reading file.';
      this.isLoading = false;
    };
    
    reader.readAsDataURL(file);
  }

  clearSelection() {
    this.selectedFile = null;
    this.previewUrl = null;
    this.errorMessage = null;
  }


  async onUpload() {
    if (!this.selectedFile || !this.previewUrl) {
      return;
    }

    this.isLoading = true;

    try {
      // Create image element to get dimensions
      const img = new Image();
      
      const result: ImageUploadResult = await new Promise((resolve, reject) => {
        if (this.selectedFile!.type === 'image/svg+xml') {
          // For SVG files, we don't need to wait for image load
          resolve({
            file: this.selectedFile!,
            base64: this.previewUrl!,
            preview: this.previewUrl!,
            width: 400, // Default width for SVG
            height: 400 // Default height for SVG
          });
        } else {
          img.onload = () => {
            resolve({
              file: this.selectedFile!,
              base64: this.previewUrl!,
              preview: this.previewUrl!,
              width: img.width,
              height: img.height
            });
          };
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = this.previewUrl!;
        }
      });

      // Process the upload result - we'll update this method to handle image generation
      this.processUploadedImage(result);
    } catch (error) {
      this.errorMessage = 'Error processing image.';
      this.isLoading = false;
    }
  }

  get acceptString(): string {
    return this.acceptedExtensions.join(',');
  }

  get canUpload(): boolean {
    return !!this.selectedFile && !this.errorMessage && !this.isLoading;
  }

  private autoProcessImage() {
    if (!this.selectedFile || !this.previewUrl) {
      return;
    }
    
    // Automatically call onUpload to process the image
    this.onUpload();
  }

  private processUploadedImage(result: ImageUploadResult) {
    this.uploadedImageData = result;
    console.log('[ImageUploadDialogComponent] Image uploaded successfully:', result);
    // Image is now ready for generation when user clicks Generate button
  }

  // Style management methods (copied from ImageModeComponent)
  onStyleChange(newStyle: string) {
    this.selectedStyle = newStyle;
    this.updateFromConfig();
    // Could auto-regenerate here if desired
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

  // Image generation method (copied from ImageModeComponent)
  generateImageVariations() {
    if (!this.uploadedImageData) {
      console.warn('[ImageUploadDialogComponent] No uploaded image data available');
      return;
    }

    console.log(`[ImageUploadDialogComponent] POST ${this.uploadedImageData.base64.substring(0, 50)}... to /api/symbols/image-to-image`);
    console.log(`[ImageUploadDialogComponent] Style: ${this.selectedStyle}, Culture: ${this.additionalText}, Background: ${this.backgroundEnabled}, Outlines: ${this.outlinesEnabled}`);
    console.log(`[ImageUploadDialogComponent] Original image size: ${this.uploadedImageData.width}x${this.uploadedImageData.height}`);
    
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
      console.log('[ImageUploadDialogComponent] Received stubbed API response:', response);
      this.generatedImages = response.images;
      this.isGenerated = true;
      this.isLoading = false;
      this.isRefreshing = false;
    });
  }

  // Gallery event handlers (copied from ImageModeComponent)
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

  // Rating event handlers (copied from ImageModeComponent)
  setRating(value: number) {
    this.rating = value;
    console.log(`[ImageUploadDialogComponent] Overall rated ${value} stars for image index: ${this.selectedImageIndex}`);
    if (value > 0) {
      this.showDetailedRatings = true;
    }
  }

  setPromptAccuracy(value: number) {
    this.promptAccuracy = value;
    console.log(`[ImageUploadDialogComponent] Prompt Accuracy rated ${value} stars for image index: ${this.selectedImageIndex}`);
  }

  setStyleAccuracy(value: number) {
    this.styleAccuracy = value;
    console.log(`[ImageUploadDialogComponent] Style Accuracy rated ${value} stars for image index: ${this.selectedImageIndex}`);
  }

  // Action handlers (copied from ImageModeComponent)
  onSave() {
    if (this.selectedImageIndex !== null && this.generatedImages[this.selectedImageIndex]) {
      console.log(`[ImageUploadDialogComponent] Save requested for generated image: ${this.generatedImages[this.selectedImageIndex]}`);
      this.saveRequested.emit(this.generatedImages[this.selectedImageIndex]);
    } else {
      console.warn('[ImageUploadDialogComponent] No image selected for save');
    }
  }

  downloadPng() {
    if (this.selectedImageIndex === null || !this.generatedImages[this.selectedImageIndex]) {
      console.warn('[ImageUploadDialogComponent] No image selected for download');
      return;
    }
    console.log(`[ImageUploadDialogComponent] Download requested for: ${this.generatedImages[this.selectedImageIndex]}`);
    // TODO: Implement actual download functionality
  }

  importToDesigner() {
    if (this.selectedImageIndex === null || !this.generatedImages[this.selectedImageIndex]) {
      console.warn('[ImageUploadDialogComponent] No image selected for editing');
      return;
    }
    console.log(`[ImageUploadDialogComponent] Import to designer requested for: ${this.generatedImages[this.selectedImageIndex]}`);
    // TODO: Implement actual import to designer functionality
  }

  // Getters (copied from ImageModeComponent)
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