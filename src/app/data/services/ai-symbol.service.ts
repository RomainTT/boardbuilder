import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env';
import { AiGenerationParams, AiGenerationResponse, PromptBuilderOptions, AiImageToImageParams } from '@data/models/ai-symbol.interfaces';

@Injectable({
  providedIn: 'root'
})
export class AiSymbolService {

  constructor(private http: HttpClient) { }

  /**
   * Generate images from AI based on prompt parameters
   */
  generateImages(params: AiGenerationParams): Observable<AiGenerationResponse> {
    console.log('[AiSymbolService] Generating images with params:', params);
    return this.http.post<AiGenerationResponse>(`${environment.scaAiApiBase}/api/symbols/generate`, params);
  }

  /**
   * Generate image variations from uploaded image using image-to-image AI
   */
  generateImageVariations(params: AiImageToImageParams): Observable<AiGenerationResponse> {
    console.log('[AiSymbolService] Generating image variations with params:', {
      ...params,
      image: `${params.image.substring(0, 50)}... (truncated base64)`
    });
    return this.http.post<AiGenerationResponse>(`${environment.scaAiApiBase}/api/symbols/generate`, params);
  }

  /**
   * Build full prompt from user inputs and style configuration
   */
  buildPrompt(options: PromptBuilderOptions): string {
    console.log('[AiSymbolService] Building prompt with options:', options);
    const { basePrompt, style, culture, backgroundEnabled, outlinesEnabled, outlineWidth, saturation } = options;

    let fullPrompt = `${basePrompt} in ${style} style`;

    if (culture) {
      fullPrompt += `, culture: ${culture}`;
    }

    fullPrompt += `, ${backgroundEnabled ? 'with' : 'without'} a background`;

    if (outlinesEnabled) {
      fullPrompt += `, using a ${outlineWidth}px outline`;
    }

    fullPrompt += `, color saturation: ${saturation}`;

    console.log('[AiSymbolService] Built prompt:', fullPrompt);
    return fullPrompt;
  }

  /**
   * Download an image from URL as PNG file
   */
  downloadImage(imageUrl: string, filename: string): Observable<Blob> {
    console.log('[AiSymbolService] Downloading image:', imageUrl, 'as:', filename);
    return this.http.get(imageUrl, { responseType: 'blob' });
  }

  /**
   * Generate appropriate filename for downloaded image
   */
  generateFilename(prompt: string, style: string): string {
    const timestamp = new Date().toISOString().replace(/[:\-T\.Z]/g, '').slice(0, 14);
    const sanitizedPrompt = prompt.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    const filename = `${sanitizedPrompt}_${style.toLowerCase()}_${timestamp}.png`.toLowerCase();
    console.log('[AiSymbolService] Generated filename:', filename);
    return filename;
  }

  /**
   * Handle the complete download flow - fetch blob and trigger download
   */
  performDownload(imageUrl: string, filename: string): Observable<void> {
    console.log('[AiSymbolService] Starting download process for:', imageUrl);
    return new Observable(observer => {
      this.downloadImage(imageUrl, filename).subscribe({
        next: (blob) => {
          if (!blob) {
            console.error('[AiSymbolService] Failed to fetch image blob');
            observer.error('Failed to fetch image blob');
            return;
          }

          console.log('[AiSymbolService] Blob received, triggering download');
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          console.log('[AiSymbolService] Download triggered successfully');

          observer.next();
          observer.complete();
        },
        error: (error) => {
          console.error('[AiSymbolService] Download error:', error);
          observer.error(error);
        }
      });
    });
  }
}
