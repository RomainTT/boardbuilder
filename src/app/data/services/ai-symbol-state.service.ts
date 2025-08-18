import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

// Style configuration interface
export interface StyleConfig {
  background: boolean;
  outlineWidth: number;
  saturation: string;
}

// Gallery state interface
export interface GalleryState {
  generatedImages: string[];
  selectedImageIndex: number | null;
  isGenerated: boolean;
  showImages: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
}

// Rating state interface
export interface RatingState {
  rating: number;
  promptAccuracy: number;
  styleAccuracy: number;
  showDetailedRatings: boolean;
}

// Style state interface
export interface StyleState {
  selectedStyle: string;
  additionalText: string;
  backgroundEnabled: boolean;
  availableStyles: string[];
}

// Error state interface
export interface ErrorState {
  apiError: string | null;
  showApiError: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AiSymbolStateService {

  // Style configurations for different styles
  private readonly styleConfigs: Record<string, StyleConfig> = {
    'Mulberry': { background: false, outlineWidth: 7, saturation: 'bold' },
    'Jellow': { background: true, outlineWidth: 5, saturation: 'bold' },
    'Tawasol': { background: true, outlineWidth: 4, saturation: 'bold' },
    'ARASAAC': { background: true, outlineWidth: 4, saturation: 'bold' },
    'Dyvogra': { background: true, outlineWidth: 2, saturation: 'soft' },
  };

  // Gallery state management
  private _galleryState$ = new BehaviorSubject<GalleryState>({
    generatedImages: [],
    selectedImageIndex: null,
    isGenerated: false,
    showImages: false,
    isLoading: false,
    isRefreshing: false
  });

  // Rating state management
  private _ratingState$ = new BehaviorSubject<RatingState>({
    rating: 0,
    promptAccuracy: 0,
    styleAccuracy: 0,
    showDetailedRatings: false
  });

  // Style state management
  private _styleState$ = new BehaviorSubject<StyleState>({
    selectedStyle: 'Mulberry',
    additionalText: '',
    backgroundEnabled: true,
    availableStyles: Object.keys(this.styleConfigs)
  });

  // Error state management
  private _errorState$ = new BehaviorSubject<ErrorState>({
    apiError: null,
    showApiError: false
  });

  // Public observables
  readonly galleryState$: Observable<GalleryState> = this._galleryState$.asObservable();
  readonly ratingState$: Observable<RatingState> = this._ratingState$.asObservable();
  readonly styleState$: Observable<StyleState> = this._styleState$.asObservable();
  readonly errorState$: Observable<ErrorState> = this._errorState$.asObservable();

  // Computed observables
  readonly selectedImageUrl$: Observable<string> = combineLatest([
    this._galleryState$
  ]).pipe(
    map(([galleryState]) => {
      if (galleryState.selectedImageIndex !== null && galleryState.generatedImages[galleryState.selectedImageIndex]) {
        return galleryState.generatedImages[galleryState.selectedImageIndex];
      }
      return '';
    })
  );

  constructor() {
    // Initialize background enabled based on default style
    this.updateStyleConfiguration('Mulberry');
  }

  // Gallery state methods
  setGeneratedImages(images: string[]): void {
    console.log('[AiSymbolStateService] Setting generated images:', {
      count: images.length,
      previews: images.map((img, i) => `${i}: ${img.substring(0, 30)}...`)
    });
    this._galleryState$.next({
      ...this._galleryState$.value,
      generatedImages: images,
      isGenerated: true
    });
  }

  selectImage(index: number): void {
    console.log('[AiSymbolStateService] Image selected - selected image panel opening:', {
      index,
      imagePreview: this._galleryState$.value.generatedImages[index]?.substring(0, 30) + '...' || 'none'
    });
    this._galleryState$.next({
      ...this._galleryState$.value,
      selectedImageIndex: index
    });
    // Clear ratings when selecting a new image
    this.clearRatings();
  }

  clearSelection(): void {
    console.log('[AiSymbolStateService] Clearing selection - side panel closing');
    this._galleryState$.next({
      ...this._galleryState$.value,
      selectedImageIndex: null
    });
    this.clearRatings();
  }

  setLoading(loading: boolean): void {
    this._galleryState$.next({
      ...this._galleryState$.value,
      isLoading: loading
    });
  }

  setRefreshing(refreshing: boolean): void {
    this._galleryState$.next({
      ...this._galleryState$.value,
      isRefreshing: refreshing
    });
  }

  setShowImages(show: boolean): void {
    this._galleryState$.next({
      ...this._galleryState$.value,
      showImages: show
    });
  }

  clearGalleryState(): void {
    const currentState = this._galleryState$.value;
    console.log('[AiSymbolStateService] Clearing gallery state:', {
      hadImages: currentState.generatedImages.length,
      wasSelected: currentState.selectedImageIndex,
      wasGenerated: currentState.isGenerated
    });
    this._galleryState$.next({
      generatedImages: [],
      selectedImageIndex: null,
      isGenerated: false,
      showImages: false,
      isLoading: false,
      isRefreshing: false
    });
  }

  // Rating state methods
  setRating(value: number): void {
    console.log('[AiSymbolStateService] Rating set:', {
      rating: value,
      selectedImage: this._galleryState$.value.selectedImageIndex
    });
    this._ratingState$.next({
      ...this._ratingState$.value,
      rating: value,
      showDetailedRatings: value > 0
    });
  }

  setPromptAccuracy(value: number): void {
    this._ratingState$.next({
      ...this._ratingState$.value,
      promptAccuracy: value
    });
  }

  setStyleAccuracy(value: number): void {
    this._ratingState$.next({
      ...this._ratingState$.value,
      styleAccuracy: value
    });
  }

  clearRatings(): void {
    this._ratingState$.next({
      rating: 0,
      promptAccuracy: 0,
      styleAccuracy: 0,
      showDetailedRatings: false
    });
  }

  // Style state methods
  setSelectedStyle(style: string): void {
    this._styleState$.next({
      ...this._styleState$.value,
      selectedStyle: style
    });
    this.updateStyleConfiguration(style);
  }

  setAdditionalText(text: string): void {
    this._styleState$.next({
      ...this._styleState$.value,
      additionalText: text
    });
  }

  setBackgroundEnabled(enabled: boolean): void {
    this._styleState$.next({
      ...this._styleState$.value,
      backgroundEnabled: enabled
    });
  }

  private updateStyleConfiguration(styleName: string): void {
    const config = this.styleConfigs[styleName];
    if (config) {
      this._styleState$.next({
        ...this._styleState$.value,
        backgroundEnabled: config.background
      });
    }
  }

  getStyleConfiguration(styleName: string): StyleConfig | null {
    return this.styleConfigs[styleName] || null;
  }

  // Error state methods
  setApiError(message: string): void {
    console.log('[AiSymbolStateService] API Error:', message);
    this._errorState$.next({
      apiError: message,
      showApiError: true
    });
    // Stop loading states when error occurs
    this.setLoading(false);
    this.setRefreshing(false);
  }

  clearApiError(): void {
    this._errorState$.next({
      apiError: null,
      showApiError: false
    });
  }

  // Getter methods for current state values (for components that need immediate access)
  get currentGalleryState(): GalleryState {
    return this._galleryState$.value;
  }

  get currentRatingState(): RatingState {
    return this._ratingState$.value;
  }

  get currentStyleState(): StyleState {
    return this._styleState$.value;
  }

  get currentErrorState(): ErrorState {
    return this._errorState$.value;
  }

  get selectedImageUrl(): string {
    const state = this.currentGalleryState;
    if (state.selectedImageIndex !== null && state.generatedImages[state.selectedImageIndex]) {
      return state.generatedImages[state.selectedImageIndex];
    }
    return '';
  }

  // Comprehensive reset method - call this when starting fresh
  resetAllState(): void {
    console.log('[AiSymbolStateService] Resetting all state');
    // Reset all state to initial values
    this.clearGalleryState();
    this.clearRatings();
    this.clearApiError();
  }
}
