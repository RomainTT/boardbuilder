import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Media } from '@data/models/media.model';

@Injectable({
  providedIn: 'root'
})
export class MediaUpdateService {
  private mediaUpdated = new Subject<Media>();
  mediaUpdated$ = this.mediaUpdated.asObservable();

  triggerUpdate(media: Media) {
    this.mediaUpdated.next(media);
  }
}