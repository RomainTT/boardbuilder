import { Inject, Injectable, LOCALE_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env';

type SessionState = 'active' | 'closed' | 'abandoned';
type ActionType = 'download png' | 'save' | 'send to designer' | 'selected' | 'Remove Background' | 'Undo Background Removal';
type RatingType = 'initial' | 'prompt accuracy' | 'style accuracy';

export interface CreateSessionPayload {
  state?: SessionState;
  start_time?: string;
  end_time?: string;
  access_point?: string;
  language?: string;
  ip_country?: string;
}

export interface UpdateSessionPayload {
  state?: SessionState;
  end_time?: string;
}

export interface CreatePromptPayload {
  session_id: number;
  user_input: string;
  full_prompt: string;
  style?: string;
  culture?: string;
}

export interface CreateGeneratedImagePayload {
  prompt_id: number;
  image_url: string;
  position: number;
  session_id: number;
}

export interface UpdateGeneratedImagePayload {
  image_url_bg_removed?: string;
}

export interface CreateActionPayload {
  image_id: number;
  action_type: ActionType;
}

export interface CreateImageRatingPayload {
  image_id: number;
  rating_type: RatingType;
  value: number;
}

export interface UpdateImageRatingPayload {
  value?: number;
}

@Injectable({ providedIn: 'root' })
export class ScaiAnalyticsService {
  currentSessionId: number | null = null;
  lastPromptId: number | null = null;
  private imageUrlToId = new Map<string, number>();
  private imageIdAndTypeToRatingId = new Map<string, number>();

  constructor(
    private http: HttpClient,
    @Inject(LOCALE_ID) private locale: string
  ) {}

  private getApiUrl(endpoint: string): string {
    return `${environment.boardBuilderApiBase}/ai/${endpoint}`;
  }

  setCurrentSession(id: number | null): void {
    this.currentSessionId = id;
  }

  getImageIdForUrl(url: string): number | null {
    return this.imageUrlToId.get(url) ?? null;
  }

  updateImageUrlMapping(oldUrl: string, newUrl: string): void {
    const imageId = this.imageUrlToId.get(oldUrl);
    if (imageId) {
      this.imageUrlToId.delete(oldUrl);
      this.imageUrlToId.set(newUrl, imageId);
    }
  }

  createSession(payload: CreateSessionPayload = {}): Observable<{ id: number } & CreateSessionPayload> {
    const body: CreateSessionPayload = {
      state: payload.state ?? 'active',
      start_time: payload.start_time ?? new Date().toISOString(),
      end_time: payload.end_time,
      access_point: payload.access_point ?? 'Board Builder',
      language: payload.language ?? this.locale,
      ip_country: payload.ip_country
    };
    return this.http.post<{ id: number } & CreateSessionPayload>(
      this.getApiUrl('sessions'),
      body
    );
  }

  updateSession(sessionId: number, payload: UpdateSessionPayload): Observable<{ success: true; id: number } & UpdateSessionPayload> {
    const body = { ...payload };
    return this.http.patch<{ success: true; id: number } & UpdateSessionPayload>(
      this.getApiUrl(`sessions/${sessionId}`),
      body
    );
  }

  markSessionCompleted(sessionId: number, end: Date = new Date()): Observable<{ success: true; id: number; state: SessionState; end_time: string }> {
    const body: UpdateSessionPayload = { state: 'closed', end_time: end.toISOString() };
    return this.http.patch<{ success: true; id: number; state: SessionState; end_time: string }>(
      this.getApiUrl(`sessions/${sessionId}`),
      body
    );
  }

  markSessionAborted(sessionId: number, end: Date = new Date()): Observable<{ success: true; id: number; state: SessionState; end_time: string }> {
    const body: UpdateSessionPayload = { state: 'abandoned', end_time: end.toISOString() };
    return this.http.patch<{ success: true; id: number; state: SessionState; end_time: string }>(
      this.getApiUrl(`sessions/${sessionId}`),
      body
    );
  }

  createPrompt(payload: CreatePromptPayload): Observable<{ id: number } & CreatePromptPayload> {
    return this.http.post<{ id: number } & CreatePromptPayload>(
      this.getApiUrl('prompts'),
      payload
    ).pipe(
      map(response => {
        this.lastPromptId = response.id;
        return response;
      })
    );
  }

  createGeneratedImage(payload: CreateGeneratedImagePayload): Observable<{ id: number } & CreateGeneratedImagePayload> {
    return this.http.post<{ id: number } & CreateGeneratedImagePayload>(
      this.getApiUrl('generated_images'),
      payload
    ).pipe(
      map(response => {
        this.imageUrlToId.set(payload.image_url, response.id);
        return response;
      })
    );
  }

  updateGeneratedImage(imageId: number, payload: UpdateGeneratedImagePayload): Observable<{ success: true; id: number } & UpdateGeneratedImagePayload> {
    const body = { ...payload };
    return this.http.patch<{ success: true; id: number } & UpdateGeneratedImagePayload>(
      this.getApiUrl(`generated_images/${imageId}`),
      body
    );
  }

  createAction(payload: CreateActionPayload): Observable<{ id: number } & CreateActionPayload> {
    return this.http.post<{ id: number } & CreateActionPayload>(
      this.getApiUrl('actions'),
      payload
    );
  }

  createImageRating(payload: CreateImageRatingPayload): Observable<{ id: number } & CreateImageRatingPayload> {
    return this.http.post<{ id: number } & CreateImageRatingPayload>(
      this.getApiUrl('image_ratings'),
      payload
    ).pipe(
      map(response => {
        const key = `${payload.image_id}:${payload.rating_type}`;
        this.imageIdAndTypeToRatingId.set(key, response.id);
        return response;
      })
    );
  }

  updateImageRating(imageRatingId: number, payload: UpdateImageRatingPayload): Observable<{ success: true; id: number } & UpdateImageRatingPayload> {
    const body = { ...payload };
    return this.http.patch<{ success: true; id: number } & UpdateImageRatingPayload>(
      this.getApiUrl(`image_ratings/${imageRatingId}`),
      body
    );
  }

}


