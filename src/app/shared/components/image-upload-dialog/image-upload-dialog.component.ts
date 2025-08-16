import { Component, OnInit, Output, EventEmitter } from '@angular/core';

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
  acceptedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
  acceptedExtensions = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
  maxSizeInMB = 5;
  maxWidth = 2000;
  maxHeight = 2000;

  // Component-specific properties
  uploadedImageData: ImageUploadResult | null = null;
  @Output() imageUploaded = new EventEmitter<ImageUploadResult>();

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
    console.log('[ImageUploadDialogComponent] Image uploaded:', {
      filename: result.file.name,
      dimensions: `${result.width}x${result.height}`,
      fileSize: `${(result.file.size / 1024).toFixed(1)}KB`
    });
    // Emit the uploaded image data for parent components to handle
    this.imageUploaded.emit(result);
  }

}
