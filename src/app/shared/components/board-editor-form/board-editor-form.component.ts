import {Component, ElementRef, Input, OnInit, ViewChild} from '@angular/core';
import {Board} from '@data/models/board.model';
import {BoardTemplate} from '@data/models/board-template.model';
import {BoardService} from '@data/services/board.service';
import { MediaService } from '@data/services/media.service';
import { Media } from '@data/models/media.model';
import { MediaUpdateService } from '@data/services/media-update.service'; // Add this
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-board-editor-form',
  templateUrl: './board-editor-form.component.html',
  styleUrls: ['./board-editor-form.component.scss']
})
export class BoardEditorFormComponent implements OnInit {

  @Input() board: Board;
  @Input() media: Media[];

  @ViewChild('titleField') titleField: ElementRef;

  templates: BoardTemplate[];
  selectedTab: number;

  constructor(
    private service: BoardService,
    private mediaService: MediaService,
    private mediaUpdateService: MediaUpdateService // Add this
  ) { }

  ngOnInit(): void {
    this.service.templates().subscribe(
      templates => {
        this.templates = templates;

        // If the Board doesn't match any Generic Templates, select the Custom Settings tab.
        if (this.board.persisted() && !templates.find(t => this.board.matchesTemplate(t))) {
          this.selectedTab = 2;
        }
      }
    );
  }

  selectTemplate(template: BoardTemplate) {
    this.board.rows = template.board.rows;
    this.board.columns = template.board.columns;
    this.board.captions_position = template.board.captions_position;
    this.board.populateCells();
  }

  focusTitleField(): void {
    setTimeout(() => this.titleField.nativeElement.select(), 500);
  }

loadMedia(newMedia: Media) {
    console.log('loadMedia called in BoardEditor with newMedia:', newMedia);
    this.mediaService.list().subscribe(updatedMedia => {
      this.media = updatedMedia; // Refresh the media list
      console.log('BoardEditor media updated:', this.media);
      // Update UI to reflect new media in the board cell
    }, error => {
      console.log('Media load error in BoardEditor:', error);
    });
  }
}
