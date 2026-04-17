import {Injectable} from '@angular/core';

const GS_LANGUAGE_STORAGE_KEY = 'boardbuilder.symbolSearch.gsLanguageIso639_3';

/**
 * Persists Global Symbols search preferences (client-only, survives refresh).
 */
@Injectable({
  providedIn: 'root'
})
export class SymbolSearchPreferencesService {

  getPreferredGsLanguage(): string | null {
    try {
      return localStorage.getItem(GS_LANGUAGE_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  setPreferredGsLanguage(iso639_3: string): void {
    try {
      localStorage.setItem(GS_LANGUAGE_STORAGE_KEY, iso639_3);
    } catch {
      // QuotaExceededError, private mode, etc.
    }
  }
}
