import {Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild, ChangeDetectorRef} from '@angular/core';
import {Media} from '@data/models/media.model';
import {MediaService} from '@data/services/media.service';
import {DialogService} from '@app/services/dialog.service';
import { MediaUpdateService } from '@data/services/media-update.service';
import { Subscription } from 'rxjs';


export enum UploadStatus {
  Idle = 'Idle',
  Uploading = 'Uploading',
  Error = 'Error'
}

export enum UploadErrorReason {
  WrongType = 'WrongType',
  TooLarge = 'TooLarge',
  Unknown = 'Unknown'
}

@Component({
  selector: 'app-media-library',
  templateUrl: './media-library.component.html',
  styleUrls: ['./media-library.component.scss']
})
export class MediaLibraryComponent implements OnInit {

  loadingMedia = false;
  loadingMediaError = false;
  media: Media[];
  pageIndex = 0; // zero-based for paginator
  pageSize = 50;
  length = 0;

  uploadStatus: UploadStatus;
  uploadError?: UploadErrorReason;

  dropzoneActive = false;

  maxSize = 10000000;
  allowedTypes = ['image/svg+xml', 'image/jpeg', 'image/gif', 'image/png'];

  @Input() showCreate: boolean;

  @Output() readonly mediaSelect = new EventEmitter<Media>();

  @ViewChild('fileUpload') fileUpload: ElementRef;

  private subscription: Subscription;
  
  constructor(
    private service: MediaService,
    private dialogService: DialogService,
    private mediaUpdateService: MediaUpdateService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadPage(0, this.pageSize);
    this.resetUploadStatus();
    this.subscription = this.mediaUpdateService.mediaUpdated$.subscribe(media => {
      this.loadPage(0, this.pageSize, media); // Reload first page to show newest
    });
  }

  onPageChange(event: any): void {
    console.log('Page change event:', event);
    console.log('Event details:', {
      pageIndex: event.pageIndex,
      pageSize: event.pageSize,
      length: event.length,
      previousPageIndex: event.previousPageIndex
    });
    this.loadPage(event.pageIndex, event.pageSize);
  }

  // Debug method to check current pagination state
  get paginationState() {
    return {
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
      length: this.length,
      mediaCount: this.media?.length || 0,
      hasMultiplePages: (this.length || 0) > (this.pageSize || 10)
    };
  }

  // loadMedia(selectMediaAfterLoad?: Media): void {
  //   this.loadingMedia = true;
  //   this.service.list().subscribe(media => {
  //     this.loadingMedia = false;
  //     this.media = media;
  //     if (selectMediaAfterLoad) { this.mediaSelect.emit(selectMediaAfterLoad); }
  //   }, error => this.loadingMediaError = true);
  // }

  loadPage(index = this.pageIndex, size = this.pageSize, selectMediaAfterLoad?: Media): void {
    this.loadingMedia = true;
    this.service.listPaged({ page: index + 1, perPage: size }).subscribe(({ items, total }) => {
      console.log('Pagination data:', { items: items.length, total, page: index + 1, perPage: size });
      this.loadingMedia = false;

      // Update component properties
      this.pageIndex = index;
      this.pageSize = size;
      this.length = total;
      this.media = items;

      if (selectMediaAfterLoad) { this.mediaSelect.emit(selectMediaAfterLoad); }

      // Force change detection to update the paginator
      this.cdr.detectChanges();

      console.log('Change detection completed');
    }, error => {
      this.loadingMediaError = true;
      console.log('Media load error:', error);
    });
  }

  resetUploadStatus() {
    this.uploadStatus = UploadStatus.Idle;
    this.uploadError = null;
  }

  openFileSelector() {
    this.resetUploadStatus();
    this.fileUpload.nativeElement.click();
  }

  selectFile() {
    if (this.fileUpload.nativeElement.files.length === 1) {
      this.uploadFile(this.fileUpload.nativeElement.files[0]);
    }
  }

  dropFile($event: DragEvent) {
    this.allowDragDrop($event);
    this.resetUploadStatus();
    const files = $event.dataTransfer.files;
    if (files.length === 1) { this.uploadFile(files[0]); }
  }

  uploadFile(file: File) {
    if (!this.allowedTypes.includes(file.type)) {
      this.uploadStatus = UploadStatus.Error;
      this.uploadError = UploadErrorReason.WrongType;
    } else if (file.size > this.maxSize) {
      this.uploadStatus = UploadStatus.Error;
      this.uploadError = UploadErrorReason.TooLarge;
    } else {
      this.uploadStatus = UploadStatus.Uploading;

      this.service.add(file).subscribe(media => {
        this.media.push(media);
        this.mediaSelect.emit(media);
        this.fileUpload.nativeElement.value = null;
        this.uploadStatus = UploadStatus.Idle;
        this.mediaUpdateService.triggerUpdate(media); // Broadcast the new media
      }, error => {
        this.fileUpload.nativeElement.value = null;
        this.uploadStatus = UploadStatus.Error;
        this.uploadError = UploadErrorReason.Unknown;
      });
    }
  }

  allowDragDrop($event: DragEvent) {
    $event.preventDefault();
    $event.stopPropagation();
  }

  openSymbolCreator(media?: Media) {
    const currentDialogRef = this.dialogService.openSymbolCreator({ data: { media } });

    currentDialogRef.afterClosed().subscribe(mediaItem => {
      // Reload the Media list
      if (mediaItem) { this.loadPage(0, this.pageSize, mediaItem); }
    });
  }

  openSymbolCreatorAi(media?: Media) {
    const currentDialogRef = this.dialogService.openSymbolCreatorAI(media, 'media');

    currentDialogRef.afterClosed().subscribe(mediaItem => {
      if (mediaItem) { this.loadPage(0, this.pageSize, mediaItem); } // Match SymbolCreator pattern
    });
  }

}
