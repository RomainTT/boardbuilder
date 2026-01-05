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
  animations: [
    trigger('mediaCollapse', [
      state('initial', style({height: '*', opacity: 1, transform: 'scale(1)'})),
      state('animate', style({height: '*', opacity: 1, transform: 'scale(1)'})),
      transition('void => animate', [
        style({height: 0, opacity: 0, transform: 'scale(0.98)'}),
        animate('180ms ease-out', style({height: '*', opacity: 1, transform: 'scale(1)'}))
      ]),
      transition('animate => void', [
        style({height: '*', opacity: 1, transform: 'scale(1)'}),
        animate('180ms ease-in', style({height: 0, opacity: 0, transform: 'scale(0.98)'}))
      ])
    ]),
    trigger('captionTransition', [
      transition('withImage => noImage', [
        animate('180ms ease-out', style({opacity: 1, transform: 'translateY(0)'}))
      ]),
      transition('noImage => withImage', [
        animate('180ms ease-out', style({opacity: 1, transform: 'translateY(0)'}))
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

  isInitialLoad = true;

  constructor(
    private dialogService: DialogService,
    private boardService: BoardService
  ) { }

  ngOnChanges() {
    // Mark initial load as complete after first change
    if (this.isInitialLoad && this.board) {
      setTimeout(() => this.isInitialLoad = false, 100);
    }
  }

  selectCell(cell: Cell) {
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
