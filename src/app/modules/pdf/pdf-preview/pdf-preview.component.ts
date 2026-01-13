import {Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {BoardService} from '@data/services/board.service';
import {ActivatedRoute, Router} from '@angular/router';
import {Location} from '@angular/common';
import {Hotkey, HotkeysService} from '@conflito/angular2-hotkeys';
import {ToolbarService} from '@app/services/toolbar.service';
import {Board} from '@data/models/board.model';
import {saveAs} from 'file-saver';
import {TemplateService} from '@data/services/template.service';
import {PageSize} from '@data/models/page-size.model';
import {Template} from '@data/models/template.model';
import {DomSanitizer} from '@angular/platform-browser';
import {HttpErrorResponse} from '@angular/common/http';
import {ApiError} from '@data/interfaces/api-error.interface';
import {GlobalSymbolsService} from '@data/services/global-symbols.service';
import {Symbolset} from '@data/models/symbolset';

@Component({
  selector: 'app-pdf-preview',
  templateUrl: './pdf-preview.component.html',
  styleUrls: ['./pdf-preview.component.scss']
})
export class PdfPreviewComponent implements OnInit, OnDestroy {

  constructor(
    private boardService: BoardService,
    private templateService: TemplateService,
    private globalSymbolsService: GlobalSymbolsService,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private sanitiser: DomSanitizer,
    private hotkeysService: HotkeysService,
    private toolbarService: ToolbarService
  ) {
    // Keyboard shortcut - delete Board
    this.hotkeysService.add(new Hotkey('escape', () => {
      this.returnToBoard();
      return false; // Prevent bubbling
    }));

    this.template = new Template();

    this.fontSizes = Array.from(Array(108).keys());
    // 0, 5, 10, 15 ... 50
    this.cellSpacingValues = Array.from(Array(51).keys()).filter(v => v % 5 === 0);
  }

  status: 'loading' | 'success' | 'error' = 'loading';

  pageSizes: PageSize[];
  fontSizes: Array<number>;
  cellSpacingValues: Array<number>;

  template: Template;

  board: Board;
  compiledPdfUrl = 'about:blank';
  private compiledPdfBlob: Blob | null = null;
  apiError: ApiError;

  pdfEmbedWidth = 1000;
  pdfEmbedHeight = 600;

  showReset = false;

  symbolsets: Symbolset[] = [];
  symbolsetInfo: Array<{symbolset: Symbolset, count: number}> = [];

  get boardHasPictos(): boolean {
    return this.board && this.board.cells && this.board.cells.some(cell => cell.picto);
  }

  // @ViewChild('pdfFrame') pdfFrame: ElementRef;
  // @ViewChild('pdfObject') pdfObject: ElementRef;

  ngOnInit() {

    // this.compiledPdf = this.sanitiser.bypassSecurityTrustResourceUrl(null);

    this.boardService.get(this.route.snapshot.paramMap.get('board_id'))
      .subscribe({
        next: (board) => {
          console.log('✅ [PDF Preview] Board loaded:', board.name, `(${board.cells?.length || 0} cells)`);
          this.board = board;

          this.loadSymbolsets();
          this.setTemplateDefaults();
        },
        error: (error) => {
          console.error('❌ [PDF Preview] Failed to load board:', error);
        }
      });

    this.toolbarService.setButtons([{
      text: 'Board Set',
      icon: 'arrow_back',
      action: () => this.router.navigate(['/', 'boardsets', this.route.snapshot.paramMap.get('id')])
    }]);
  }

  // Configures some default template settings.
  // Run this after populating this.board.
  setTemplateDefaults() {
    this.showReset = false;
    this.template.orientation = (this.board.rows > this.board.logicalColumns) ? 'portrait' : 'landscape';

    this.templateService.pageSizes().subscribe(
      sizes => {
        this.pageSizes = sizes;
        this.template.pageSize = sizes.find(s => s.name === 'A4');

        this.template.fontSize = Math.round((this.template.pageSize.y / this.board.rows) * 0.1);
        this.template.cellPadding = 10;
        this.template.cellSpacing = 10;
        this.template.drawCellBorders = true;
        this.template.showHeader = false;
        this.template.imageTextSpacing = -1;

        this.loadPdf();
      }
    );
  }

  onSettingChanged() {
    this.showReset = true;
    this.loadPdf();
  }

  loadPdf() {
    this.status = 'loading';
    this.apiError = null;

    this.setEmbedHeight();

    // Revoke any previous object URL before generating a new one.
    this.revokeCompiledPdfUrl();

    this.boardService.pdfBlob(this.route.snapshot.paramMap.get('board_id'), this.template)
      .then(blob => {
        this.compiledPdfBlob = blob;
        this.compiledPdfUrl = URL.createObjectURL(blob);

        // const clone = this.pdfFrame.nativeElement.cloneNode(true);
        // clone.setAttribute('src', this.compiledPdf);
        // this.pdfFrame.nativeElement = clone;

        // this.pdfFrame.nativeElement.removeAttribute('src');
        // setTimeout(() => this.pdfFrame.nativeElement.src = this.compiledPdf);
        this.status = 'success';

      }, (error: HttpErrorResponse) => {
        error.error.text().then(text => {
          this.apiError = JSON.parse(text).error;
        });
        return this.status = 'error';
      });
  }

  setEmbedHeight(): void {
    // Set the height of the PDF Embed container so it fits the paper size
    if (this.template.orientation === 'portrait') {
      this.pdfEmbedHeight = this.pdfEmbedWidth * this.template.pageSize.ratio + 60;
    } else {
      this.pdfEmbedHeight = this.pdfEmbedWidth / this.template.pageSize.ratio + 60;
    }

  }

  downloadPdf() {
    if (this.compiledPdfBlob) {
      saveAs(this.compiledPdfBlob, `${this.board.name}.pdf`);
    } else if (this.compiledPdfUrl) {
      // Fallback: file-saver can also accept a URL string in some cases.
      saveAs(this.compiledPdfUrl, `${this.board.name}.pdf`);
    }
  }

  loadSymbolsets() {
    console.log('🔍 [PDF Preview] Loading symbolsets...');
    this.globalSymbolsService.getSymbolSets().subscribe({
      next: (symbolsets) => {
        console.log('✅ [PDF Preview] Symbolsets loaded:', symbolsets?.length || 0);
        this.symbolsets = symbolsets;
        console.log('🔄 [PDF Preview] Calling processSymbolsetInfo...');
        this.processSymbolsetInfo();
      },
      error: (error) => {
        console.error('❌ [PDF Preview] Symbolsets API failed:', error);
      }
    });
  }

  processSymbolsetInfo() {
    console.log('🔄 [PDF Preview] processSymbolsetInfo called');

    if (!this.board || !this.symbolsets.length) {
      console.log('⚠️ [PDF Preview] Missing prerequisites:', { board: !!this.board, symbolsets: this.symbolsets?.length || 0 });
      return;
    }

    console.log('📊 [PDF Preview] Board has', this.board.cells?.length || 0, 'cells');

    // Debug: Check what's actually in the cells
    console.log('🔍 [PDF Preview] Inspecting first 3 cells:');
    this.board.cells.slice(0, 3).forEach((cell, index) => {
      console.log(`   Cell ${index}:`, {
        hasPicto: !!cell.picto,
        hasImageUrl: !!cell.image_url,
        pictoData: cell.picto ? {
          id: cell.picto.id,
          symbolset_id: cell.picto.symbolset_id,
          part_of_speech: cell.picto.part_of_speech
        } : null,
        cellKeys: Object.keys(cell)
      });
    });

    // Get all pictos from cells that have pictos
    const cellsWithPictos = this.board.cells.filter(cell => cell.picto);
    console.log('🖼️ [PDF Preview] Found', cellsWithPictos.length, 'cells with pictos');

    if (cellsWithPictos.length === 0) {
      console.log('⚠️ [PDF Preview] No pictos found - symbolset section will not show');
      console.log('💡 [PDF Preview] Make sure you are adding SYMBOLS (not images) to cells in the board builder');
      this.symbolsetInfo = [];
      return;
    }

    const pictos = cellsWithPictos.map(cell => cell.picto);
    console.log('🖼️ [PDF Preview] Pictos:', pictos.map(p => ({ id: p.id, symbolset_id: p.symbolset_id })));

    // Group pictos by symbolset_id and count them
    const symbolsetCounts = new Map<number, number>();
    pictos.forEach(picto => {
      if (!picto.symbolset_id) {
        console.log('⚠️ [PDF Preview] Picto missing symbolset_id:', picto.id);
        return;
      }
      const count = symbolsetCounts.get(picto.symbolset_id) || 0;
      symbolsetCounts.set(picto.symbolset_id, count + 1);
    });

    console.log('📈 [PDF Preview] Symbolset counts:', Array.from(symbolsetCounts.entries()));

    // Create the symbolset info array with symbolset details
    const rawSymbolsetInfo = Array.from(symbolsetCounts.entries())
      .map(([symbolsetId, count]) => {
        const symbolset = this.symbolsets.find(s => s.id === symbolsetId);
        if (!symbolset) {
          console.log('⚠️ [PDF Preview] Symbolset not found for ID:', symbolsetId);
          return null;
        }
        return { symbolset, count };
      })
      .filter(info => info !== null);

    this.symbolsetInfo = rawSymbolsetInfo.sort((a, b) => a.symbolset.name.localeCompare(b.symbolset.name));

    console.log('✅ [PDF Preview] Symbolset info generated:', this.symbolsetInfo.length, 'symbolsets');
    if (this.symbolsetInfo.length > 0) {
      console.log('✅ [PDF Preview] Symbolsets used in this board:');
      this.symbolsetInfo.forEach(info => {
        console.log(`   📚 ${info.symbolset.name} (${info.count} symbol${info.count > 1 ? 's' : ''}) - License: ${info.symbolset.licence.name}`);
        console.log(`      Publisher: ${info.symbolset.publisher} (${info.symbolset.publisher_url})`);
      });
    } else {
      console.log('ℹ️ [PDF Preview] To test symbolset info, add symbols to this board in the board builder');
    }
  }

  returnToBoard() {
    if (this.board) {
      this.router.navigate(['/', 'boardsets', this.board.board_set_id], {
        queryParams: {board: this.board.id}
      }).then();
    } else {
      this.location.back();
    }
  }

  ngOnDestroy(): void {
    this.revokeCompiledPdfUrl();
  }

  private revokeCompiledPdfUrl(): void {
    if (this.compiledPdfUrl && this.compiledPdfUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.compiledPdfUrl);
    }
    this.compiledPdfUrl = 'about:blank';
    this.compiledPdfBlob = null;
  }

}
