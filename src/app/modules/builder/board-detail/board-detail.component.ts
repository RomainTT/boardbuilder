import {Component, EventEmitter, Input, OnChanges, Output} from '@angular/core';
import {animate, state, style, transition, trigger} from '@angular/animations';
import {Board} from '@data/models/board.model';
import {Cell} from '@data/models/cell.model';
import {DialogService} from '@app/services/dialog.service';
import {Media} from '@data/models/media.model';
import {BoardService} from '@data/services/board.service';

@Component({
  selector: 'app-board-detail',
  templateUrl: './board-detail.component.html',
  styleUrls: ['./board-detail.component.scss'],
  host: {
    '[@.disabled]': '!animationsEnabled'
  },
  animations: [
    trigger('mediaCollapse', [
      state('shown', style({height: '*', opacity: 1, transform: 'scale(1)'})),
      state('hidden', style({height: 0, opacity: 0, transform: 'scale(0.98)', overflow: 'hidden'})),
      state('shownNoAnim', style({height: '*', opacity: 1, transform: 'scale(1)'})),
      state('hiddenNoAnim', style({height: 0, opacity: 0, transform: 'scale(0.98)', overflow: 'hidden'})),

      // Enable/disable without animating (prevents refresh/load-time animations).
      transition('shownNoAnim => shown', animate('0ms')),
      transition('hiddenNoAnim => hidden', animate('0ms')),

      // Animate only once user interaction has enabled animations.
      transition('hidden => shown', animate('180ms ease-out')),
      transition('shown => hidden', animate('180ms ease-in'))
    ]),
    trigger('captionTransition', [
      state('withImage', style({opacity: 1, transform: 'translateY(0)'})),
      state('noImage', style({opacity: 1, transform: 'translateY(0)'})),
      state('withImageNoAnim', style({opacity: 1, transform: 'translateY(0)'})),
      state('noImageNoAnim', style({opacity: 1, transform: 'translateY(0)'})),

      // Enable/disable without animating (prevents refresh/load-time animations).
      transition('withImageNoAnim => withImage', animate('0ms')),
      transition('noImageNoAnim => noImage', animate('0ms')),

      transition('withImage => noImage', [
        style({opacity: 0, transform: 'translateY(6px)'}),
        animate('300ms ease-out', style({opacity: 1, transform: 'translateY(0)'}))
      ]),
      transition('noImage => withImage', [
        style({opacity: 0, transform: 'translateY(6px)'}),
        animate('300ms ease-out', style({opacity: 1, transform: 'translateY(0)'}))
      ])
    ])
  ]
})
export class BoardDetailComponent implements OnChanges {

  @Input() board: Board;
  @Input() cell: Cell;
  @Input() readonly = false;
  @Output() cellChange = new EventEmitter<Cell>();
  @Output() boardChange = new EventEmitter<number>();

  /**
   * Prevent entry/state-change animations on initial page load.
   * Enabled only after user interaction with cells (e.g. selecting a cell).
   */
  animationsEnabled = false;

  constructor(
    private dialogService: DialogService,
    private boardService: BoardService
  ) { }

  ngOnChanges() {
  }

  captionAnimationState(cell: Cell): string {
    const withImage = !!cell?.image_url;
    if (!this.animationsEnabled) {
      return withImage ? 'withImageNoAnim' : 'noImageNoAnim';
    }
    return withImage ? 'withImage' : 'noImage';
  }

  mediaAnimationState(cell: Cell): string {
    const showMedia = !!cell?.image_url || (!cell?.image_url && !cell?.caption);
    if (!this.animationsEnabled) {
      return showMedia ? 'shownNoAnim' : 'hiddenNoAnim';
    }
    return showMedia ? 'shown' : 'hidden';
  }

  selectCell(cell: Cell) {
    this.animationsEnabled = true;
    this.cellChange.emit(cell);
  }

  showBoard(linkedBoardId: number) {
    this.boardChange.emit(linkedBoardId);
  }

  selectHeaderImage() {
    this.dialogService.openMediaLibrary({
      sources: ['user_media'],
      allowClear: !!this.board.header_media
    }).afterClosed().subscribe(media => {
      if (media) {
        media.id ? this.setBoardHeaderMedia(media) : this.clearBoardHeaderMedia();
      }
    });
  }

  setBoardHeaderMedia(media: Media) {
    this.board.header_media = media;
    this.board.header_media_id = media.id;
    this.boardService.update(this.board).subscribe();
  }

  clearBoardHeaderMedia() {
    this.board.header_media = null;
    this.board.header_media_id = null;
    this.boardService.update(this.board).subscribe();
  }
}
