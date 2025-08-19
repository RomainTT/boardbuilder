/**
 * SearchResultConverter Service
 * 
 * This service handles data conversion between different formats used in the application:
 * 1. SymbolSearchResult → Cell data mapping for board population
 * 2. SymbolSearchResult → ImageUploadResult conversion for AI Designer integration
 * 
 * Key Functions:
 * - Fetches images from URLs and converts them to required formats
 * - Handles base64 encoding and blob conversion for image processing
 * - Maps search result metadata to board cell properties
 * - Provides error handling for network requests and image processing
 * 
 * Dependencies:
 * - HttpClient for fetching images from URLs
 * - ImageBase64Service for image processing utilities
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { SymbolSearchResult } from '@data/models/symbol-search-result';
import { Cell } from '@data/models/cell.model';
import { ImageUploadResult } from '@shared/components/image-upload-dialog/image-upload-dialog.component';
import { ImageBase64Service } from '@data/services/image-base64.service';

@Injectable({
  providedIn: 'root'
})
export class SearchResultConverterService {

  constructor(
    private http: HttpClient,
    private imageBase64Service: ImageBase64Service
  ) { }

  /**
   * Converts a SymbolSearchResult to partial Cell data for direct board population
   * Maps relevant properties from search result to cell structure
   * 
   * @param result - The search result to convert
   * @returns Partial Cell object with populated image and metadata
   */
  convertToCellData(result: SymbolSearchResult): Partial<Cell> {
    console.log('[SearchResultConverter] Converting to cell data:', result.label);
    
    return {
      image_url: result.imageUrl,
      // Don't set caption here - let the component decide whether to set it
      // caption: result.label || result.tooltip, // Commented out to avoid unwanted captions
      picto_id: result.pictoId,
      picto: result.picto,
      // Keep existing cell colors - they will be preserved
      // media_id will be set separately if needed
    };
  }

  /**
   * Converts a SymbolSearchResult to ImageUploadResult for AI Designer integration
   * Fetches the image from URL, converts to blob, generates base64, and extracts dimensions
   * 
   * @param result - The search result containing image URL and metadata
   * @returns Promise resolving to ImageUploadResult ready for AI processing
   */
  async convertToImageUploadResult(result: SymbolSearchResult): Promise<ImageUploadResult> {
    console.log('[SearchResultConverter] Converting to ImageUploadResult:', result.imageUrl);
    
    try {
      // Step 1: Fetch image as blob from URL
      const blob = await this.fetchImageAsBlob(result.imageUrl);
      
      // Step 2: Create File object from blob
      const file = new File([blob], this.generateFilename(result), { 
        type: blob.type || 'image/png' 
      });
      
      // Step 3: Generate base64 encoding
      const base64 = await this.blobToBase64(blob);
      
      // Step 4: Create preview data URL
      const preview = URL.createObjectURL(blob);
      
      // Step 5: Extract image dimensions
      const dimensions = await this.getImageDimensions(preview);
      
      console.log('[SearchResultConverter] Conversion completed:', {
        filename: file.name,
        size: file.size,
        dimensions: `${dimensions.width}x${dimensions.height}`
      });
      
      return {
        file,
        base64,
        preview,
        width: dimensions.width,
        height: dimensions.height
      };
      
    } catch (error) {
      console.error('[SearchResultConverter] Conversion failed:', error);
      throw new Error(`Failed to convert search result to upload format: ${error.message}`);
    }
  }

  /**
   * Fetches an image from URL and returns it as a Blob
   * @private
   */
  private fetchImageAsBlob(imageUrl: string): Promise<Blob> {
    return this.http.get(imageUrl, { responseType: 'blob' }).toPromise();
  }

  /**
   * Converts a Blob to base64 string
   * @private
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Gets image dimensions by loading it in memory
   * @private
   */
  private getImageDimensions(imageUrl: string): Promise<{width: number, height: number}> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = reject;
      img.src = imageUrl;
    });
  }

  /**
   * Generates a filename for the converted image based on search result data
   * @private
   */
  private generateFilename(result: SymbolSearchResult): string {
    const label = result.label || 'symbol';
    const sanitized = label.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const extension = this.extractExtension(result.imageUrl) || 'png';
    return `${sanitized}_${result.id}.${extension}`;
  }

  /**
   * Extracts file extension from image URL
   * @private
   */
  private extractExtension(url: string): string | null {
    const matches = url.match(/\.(jpg|jpeg|gif|png|bmp|tiff|tga|svg)$/i);
    return matches ? matches[1] : null;
  }
}
