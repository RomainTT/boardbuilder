import {Component, OnInit, OnDestroy, ChangeDetectorRef} from '@angular/core';
import {Subscription} from 'rxjs';
import {Media} from '@data/models/media.model';
import {MediaService} from '@data/services/media.service';
import {MediaUpdateService} from '@data/services/media-update.service';
import {saveAs} from 'file-saver';
import {DialogService} from '@app/services/dialog.service';

@Component({
  selector: 'app-media',
  templateUrl: './media.component.html',
  styleUrls: ['./media.component.scss']
})
export class MediaComponent implements OnInit, OnDestroy {

  media: Media[];
  loading: boolean;
  pageIndex = 0; // zero-based for paginator
  pageSize = 50;
  length = 0;
  private subscription?: Subscription;

  constructor(
    private service: MediaService,
    private dialogService: DialogService,
    private mediaUpdateService: MediaUpdateService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadPage(0, this.pageSize);
    this.subscription = this.mediaUpdateService.mediaUpdated$.subscribe(media => {
      this.loadPage(0, this.pageSize); // Reload first page when new media is created
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  onPageChange(event: any): void {
    console.log('Page change event:', event);
    this.loadPage(event.pageIndex, event.pageSize);
  }

  loadPage(index = this.pageIndex, size = this.pageSize): void {
    this.loading = true;
    this.service.listPaged({ page: index + 1, perPage: size }).subscribe(
      ({ items, total }) => {
        console.log('Pagination data:', { items: items.length, total, page: index + 1, perPage: size });
        this.loading = false;

        // Update component properties
        this.pageIndex = index;
        this.pageSize = size;
        this.length = total;
        this.media = items;

        // Force change detection to update the paginator
        this.cdr.detectChanges();
      },
      error => {
        this.loading = false;
        console.log('Media load error:', error);
      }
    );
  }

  delete(mediaItem: Media) {

    this.dialogService.delete({
      heading: `Delete this Symbol?`,
      content: `The Symbol will be permanently removed from any Boards it\'s used in.`
    }).afterClosed().subscribe(result => {

      if (result) {
        this.service.delete(mediaItem).subscribe(r => {
          // Remove the Media Item from the array of Media.
          this.media = this.media.filter(m => m !== mediaItem);
        });
      }
    });
  }

  get spaceUsed(): number {
    let sum = 0;
    this.media.forEach(a => sum += a.filesize);
    return sum;
  }

  openSymbolCreator(media?: Media) {
    this.dialogService.openSymbolCreator({ data: { media } }).afterClosed().subscribe(mediaItem => {
      // Reload the Media list
      if (mediaItem) { this.loadPage(0, this.pageSize); }
    });
  }

  openSymbolCreatorAI() {
    const currentDialogRef = this.dialogService.openSymbolCreatorAI(undefined, 'media');

    currentDialogRef.componentInstance.parentDialogRef = currentDialogRef; // Pass the dialog reference to PromptModeComponent
    currentDialogRef.afterClosed().subscribe((mediaItem: Media) => {
      if (mediaItem) {
        this.mediaUpdateService.triggerUpdate(mediaItem); // Use service instead of mediaCreated
      }
    });
  }

  download(media: Media) {
    this.service.getImage(media).subscribe(blob => {
      const extension = blob.type.match(/\/([a-z]+)/)[1];
      saveAs(blob, `image.${extension}`);
    });
  }
}
