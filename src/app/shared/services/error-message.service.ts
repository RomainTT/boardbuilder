import { Injectable } from '@angular/core';

/**
 * Maps technical HTTP/API errors into concise, user-friendly messages.
 * Keep this logic here so components remain simple and consistent.
 */
@Injectable({ providedIn: 'root' })
export class ErrorMessageService {
  toUserMessage(error: any, fallback: string = 'Something went wrong. Please try again.'): string {
    // Prefer explicit server-provided user message if present
    const explicit = error?.error?.user_message || error?.user_message;
    if (explicit && typeof explicit === 'string') {
      return explicit;
    }

    // Common HTTP status mappings
    const status: number | undefined = error?.status;
    switch (status) {
      case 0:
        return 'Unable to connect. Please check your internet connection and try again.';
      case 400:
        return 'Some details look invalid. Please review and try again.';
      case 401:
        return 'Your session has expired. Please sign in and try again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'We could not find what you were looking for.';
      case 409:
        return 'That action cannot be completed due to a conflict. Please refresh and try again.';
      case 413:
        return 'The upload is too large. Try a smaller file or different settings.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
      case 502:
      case 503:
      case 504:
        return 'The service is having trouble right now. Please try again shortly.';
      default:
        break;
    }

    // Fallback to a safe, generic message; avoid leaking internals
    return fallback;
  }
}


