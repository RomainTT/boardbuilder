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
    const requestId = Date.now().toString(36);
    console.log(`[AiSymbolService] → Prompt-based generation [${requestId}]:`, {
      prompt: params.prompt.substring(0, 100) + (params.prompt.length > 100 ? '...' : ''),
      promptLength: params.prompt.length,
      numImages: params.num_images,
      steps: params.steps,
      endpoint: 'api/symbols/generate'
    });
    
    return this.http.post<AiGenerationResponse>(`${environment.scaAiApiBase}/api/symbols/generate`, params);
  }

  /**
   * Generate image variations from uploaded image using image-to-image AI
   */
  generateImageVariations(params: AiImageToImageParams): Observable<AiGenerationResponse> {
    const requestId = Date.now().toString(36);
    console.log(`[AiSymbolService] → Image-to-image generation [${requestId}]:`, {
      technicalParams: {
        prompt: params.prompt.substring(0, 100) + (params.prompt.length > 100 ? '...' : ''),
        promptLength: params.prompt.length,
        imageSize: `${Math.round(params.image.length / 1024)}KB`,
        numImages: params.num_images,
        steps: params.steps,
        endpoint: 'api/symbols/generate'
      }
    });
    
    return this.http.post<AiGenerationResponse>(`${environment.scaAiApiBase}/api/symbols/generate`, params);
  }

  /**
   * Build full prompt from user inputs and style configuration
   */
  buildPrompt(options: PromptBuilderOptions): string {
    const { basePrompt, style, culture, backgroundEnabled, outlinesEnabled, outlineWidth, saturation } = options;
    
    console.log('[AiSymbolService] Building prompt from AI Controls:', {
      basePrompt: basePrompt,
      aiControlsParams: {
        style: style,
        culture: culture || '(none)',
        background: backgroundEnabled ? 'enabled' : 'disabled',
        outlines: outlinesEnabled ? `${outlineWidth}px` : 'disabled',
        saturation: saturation
      }
    });

    let fullPrompt = `${basePrompt} in ${style} style`;

    if (culture) {
      fullPrompt += `, culture: ${culture}`;
    }

    fullPrompt += `, ${backgroundEnabled ? 'with' : 'without'} a background`;

    if (outlinesEnabled) {
      fullPrompt += `, using a ${outlineWidth}px outline`;
    }

    fullPrompt += `, color saturation: ${saturation}`;

    console.log('[AiSymbolService] ✓ Final prompt generated:', fullPrompt);
    return fullPrompt;
  }

  /**
   * Download an image from URL as PNG file
   */
  downloadImage(imageUrl: string, filename: string): Observable<Blob> {
    return this.http.get(imageUrl, { responseType: 'blob' });
  }

  /**
   * Generate appropriate filename for downloaded image
   */
  generateFilename(prompt: string, style: string): string {
    const timestamp = new Date().toISOString().replace(/[:\-T\.Z]/g, '').slice(0, 14);
    const sanitizedPrompt = prompt.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    const filename = `${sanitizedPrompt}_${style.toLowerCase()}_${timestamp}.png`.toLowerCase();
    return filename;
  }

  /**
   * Handle the complete download flow - fetch blob and trigger download
   */
  performDownload(imageUrl: string, filename: string): Observable<void> {
    console.log('[AiSymbolService] Downloading:', filename);
    return new Observable(observer => {
      this.downloadImage(imageUrl, filename).subscribe({
        next: (blob) => {
          if (!blob) {
            console.error('[AiSymbolService] Failed to fetch image blob');
            observer.error('Failed to fetch image blob');
            return;
          }

          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          console.log('[AiSymbolService] ✓ Download completed:', filename);

          observer.next();
          observer.complete();
        },
        error: (error) => {
          console.error('[AiSymbolService] ✗ Download failed:', error);
          observer.error(error);
        }
      });
    });
  }
}
