import {Component, OnInit, OnDestroy} from '@angular/core';
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
  private subscription?: Subscription;

  constructor(
    private service: MediaService,
    private dialogService: DialogService,
    private mediaUpdateService: MediaUpdateService,
  ) { }

  ngOnInit(): void {
    this.loadMedia();
    this.subscription = this.mediaUpdateService.mediaUpdated$.subscribe(media => {
      this.loadMedia(); // Reload media list when new media is created
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  loadMedia(): void {
    this.loading = true;
    this.service.list().subscribe(
      media => this.media = media,
      error => null,
      () => this.loading = false
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
      if (mediaItem) { this.loadMedia(); }
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
