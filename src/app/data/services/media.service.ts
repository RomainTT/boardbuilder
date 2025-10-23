import {Injectable} from '@angular/core';
import {environment} from '@env';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {Media} from '@data/models/media.model';

@Injectable({
  providedIn: 'root'
})
export class MediaService {

  private apiEndpoint = `${environment.boardBuilderApiBase}/media`;

  constructor(private http: HttpClient) { }

  list(): Observable<Media[]> {
    return this.http.get<Media[]>(this.apiEndpoint)
      .pipe(map(arr => arr.map(item => new Media().deserialise(item))));
  }

  get(id: number|string, expand = ''): Observable<Media> {
    return this.http.get<Media>(`${this.apiEndpoint}/${id}`, { params: { expand } })
      .pipe(map(data => new Media().deserialise(data)));
  }

  add(file: File|Blob, canvas?: File|Blob): Observable<Media> {
    const formData: FormData = new FormData();

    // Use the file's own name if it's a File object, otherwise generate a proper name for blobs
    let fileName: string;
    if (file instanceof File) {
      fileName = file.name;
    } else {
      // For legacy blob support, use proper extension based on MIME type
      const mimeType = file.type || 'image/png';
      const extension = this.getExtensionFromMimeType(mimeType);
      fileName = `file.${extension}`;
    }

    formData.append('file', file, fileName);

    if (canvas) { formData.append('canvas', canvas, 'canvas.json'); }

    return this.http.post<Media>(this.apiEndpoint, formData)
      .pipe(map(data => new Media().deserialise(data)));
  }

  /**
   * Get file extension from MIME type
   * @private
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: { [key: string]: string } = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg'
    };
    return mimeToExt[mimeType] || 'png';
  }

  update(record: Media, file?: File|Blob, canvas?: File|Blob): Observable<Media> {
    const formData: FormData = new FormData();

    if (file) {
      // Use the file's own name if it's a File object, otherwise generate a proper name for blobs
      let fileName: string;
      if (file instanceof File) {
        fileName = file.name;
      } else {
        // For legacy blob support, use proper extension based on MIME type
        const mimeType = file.type || 'image/png';
        const extension = this.getExtensionFromMimeType(mimeType);
        fileName = `file.${extension}`;
      }

      console.log('[MediaService] Update file info:', {
        isFile: file instanceof File,
        originalName: file instanceof File ? file.name : 'N/A',
        usedName: fileName,
        mimeType: file.type
      });

      formData.append('file', file, fileName);
    }

    if (canvas) { formData.append('canvas', canvas, 'canvas.json'); }

    return this.http.patch<Media>(`${this.apiEndpoint}/${record.id}`, formData)
      .pipe(map(data => new Media().deserialise(data)));
  }

  delete(record: Media) {
    return this.http.delete<Media>(`${this.apiEndpoint}/${record.id}`);
  }

  getImage(record: Media): Observable<Blob> {
    return this.http.get(record.public_url, {
      responseType: 'blob'
    });
  }

  getCanvas(record: Media): Observable<any> {
    return this.http.get<any>(record.canvas_url);
  }

  base64toBlob(dataURI: string): Blob {

      const byteString = atob(dataURI.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);

      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      return new Blob([ab], { type: 'image/jpeg' });
  }
}
