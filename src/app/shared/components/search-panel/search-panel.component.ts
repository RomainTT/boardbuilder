import {AfterViewInit, Component, ElementRef, EventEmitter, Inject, Input, LOCALE_ID, OnInit, Output, ViewChild} from '@angular/core';
import {GlobalSymbolsService} from '@data/services/global-symbols.service';
import {BehaviorSubject, from, fromEvent, Observable} from 'rxjs';
import {debounceTime, distinctUntilChanged, filter, finalize, map} from 'rxjs/operators';
import {SymbolSearchResult} from '@data/models/symbol-search-result';
import {SymbolService} from '@data/services/symbol.service';
import {Symbolset} from '@data/models/symbolset';
import {Language} from '@data/models/language';
import {DialogService} from '@app/services/dialog.service';
import { Media } from '@data/models/media.model'; // Add this
import { MediaUpdateService } from '@data/services/media-update.service'; // Add this
import { Cell } from '@data/models/cell.model';
import { ImageActionDialogComponent, ImageAction, ImageActionDialogData } from '../image-action-dialog/image-action-dialog.component';
import { SearchResultConverterService } from '@shared/services/search-result-converter.service';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-search-panel',
  templateUrl: './search-panel.component.html',
  styleUrls: ['./search-panel.component.scss']
})
export class SearchPanelComponent implements AfterViewInit, OnInit {

  sources = [];

  query: string;
  source: any;

  gsParams: {
    symbolset: GroupedGsParam<Symbolset>;
    language: FlatGsParam<Language>;
  };

  // Initialised to null, which means no search has been performed yet.
  // Then changes to true/false
  private loadingSubject = new BehaviorSubject<boolean>(null);
  public loading$ = this.loadingSubject.asObservable();

  private resultsSubject = new BehaviorSubject<SymbolSearchResult[]>(null);
  public results$ = this.resultsSubject.asObservable();

  @ViewChild('queryInput') queryInput: ElementRef;

  @Input() initialQuery: string;
  @Output() readonly selectionChange = new EventEmitter<SymbolSearchResult>();
  @Output() readonly mediaCreated = new EventEmitter<Media>(); // Add this to notify parent
  @Output() readonly cellDataSelected = new EventEmitter<Partial<Cell>>(); // For direct cell population


  constructor(
    private globalSymbolsService: GlobalSymbolsService,
    private symbolService: SymbolService,
    private dialogService: DialogService,
    private mediaUpdateService: MediaUpdateService,
    private dialog: MatDialog,
    private searchResultConverter: SearchResultConverterService,
    @Inject(LOCALE_ID) public locale: string
  ) {

    this.sources = this.globalSymbolsService.sources;
    this.source = this.sources[0];

    this.gsParams = {
      symbolset: { value: 'all', groups: [] },
      language: { value: 'eng', options: [] }
    };

  }

  ngOnInit(): void {
    this.globalSymbolsService.getLanguages().subscribe(
      languages => {
        const param = this.gsParams.language;
        param.options = languages;

        // Default the language param to the current locale.
        // First, get the main locale (e.g. 'en' for 'en-gb', or 'fr' for 'fr').
        const currentLocaleBase = this.locale.match(/^(\w+)/)[1];
        param.value = languages.find(l => l.iso639_1 === currentLocaleBase)?.iso639_3 || languages[0].iso639_3;
      }
    );
    this.globalSymbolsService.getSymbolSets().subscribe(
      ss => this.gsParams.symbolset.groups = [
        { name: $localize`Core Sets`, options: ss.filter(q => q.featured_level)},
        { name: $localize`Other Sets`, options: ss.filter(q => !q.featured_level)},
      ]
    );

    this.query = this.initialQuery;
  }

  ngAfterViewInit() {
    fromEvent(this.queryInput.nativeElement, 'keyup').pipe(

      // get value
      map((event: any) => event.target.value),

      // if character length greater then 0
      filter(res => res.length > 0),

      // Time in milliseconds between key events
      debounceTime(500),

      // If previous query is different from current
      distinctUntilChanged()

      // subscription for response
    ).subscribe((text: string) => {
      if (this.query !== '') {
        this.searchCall().subscribe(results => {
          this.resultsSubject.next(results);
        });
      }
    });
  }

  search() {
    this.searchCall().subscribe(results => {
      this.resultsSubject.next(results);
    });
  }

  searchCall(): Observable<SymbolSearchResult[]> {
    this.loadingSubject.next(true);
    if (this.source.key === 'gs') {
      // Build params
      const params = {
        query: this.query,
        language: this.gsParams.language.value,
        language_iso_format: '639-3',
        symbolset: this.gsParams.symbolset.value,
        limit: 48,
        expand: 'picto.symbolset'
      };

      // Remove the symbolset param, if it's blank
      if (params.symbolset === 'all') { delete params.symbolset; }

      return from(this.globalSymbolsService.search(params)).pipe(finalize(() => {
        this.loadingSubject.next(false);
      }));

    } else {
      return from(this.symbolService.search(this.query, this.source)).pipe(finalize(() => {
        this.loadingSubject.next(false);
      }));
    }
  }

  selectImage(result: SymbolSearchResult) {
    console.log('[SearchPanel] Image selected - opening action dialog:', {
      id: result.id,
      label: result.label,
      imageUrl: result.imageUrl
    });
    
    // Open the ImageActionDialog to let user choose what to do with the selected image
    const dialogData: ImageActionDialogData = { result };
    
    const dialogRef = this.dialog.open(ImageActionDialogComponent, {
      maxWidth: '95vw',
      width: 'auto',
      data: dialogData
    });
    
    dialogRef.afterClosed().subscribe((action: ImageAction) => {
      if (action) {
        console.log('[SearchPanel] User selected action:', action);
        this.handleImageAction(result, action);
      } else {
        console.log('[SearchPanel] Dialog cancelled');
      }
    });
  }

  /**
   * Handles the user's selected action for a search result image
   * @param result - The selected search result
   * @param action - The action chosen by the user (USE_AS_IS or SEND_TO_AI)
   */
  private handleImageAction(result: SymbolSearchResult, action: ImageAction): void {
    switch (action) {
      case ImageAction.USE_AS_IS:
        console.log('[SearchPanel] Handling USE_AS_IS action');
        this.handleUseAsIs(result);
        break;
        
      case ImageAction.SEND_TO_AI:
        console.log('[SearchPanel] Handling SEND_TO_AI action');
        this.handleSendToAI(result);
        break;
        
      default:
        console.warn('[SearchPanel] Unknown action:', action);
    }
  }

  /**
   * Handles the "Use as-is" action - converts search result to cell data and emits it
   * @param result - The search result to convert
   */
  private handleUseAsIs(result: SymbolSearchResult): void {
    console.log('[SearchPanel] Converting search result to cell data for direct use');
    
    const cellData = this.searchResultConverter.convertToCellData(result);
    
    console.log('[SearchPanel] Emitting cell data:', cellData);
    this.cellDataSelected.emit(cellData);
    
    // Also emit the original selectionChange for backward compatibility
    this.selectionChange.emit(result);
  }

  /**
   * Handles the "Send to AI" action - opens the AI creator with pre-loaded image
   * @param result - The search result to send to AI designer
   */
  private async handleSendToAI(result: SymbolSearchResult): Promise<void> {
    console.log('[SearchPanel] Opening AI Designer with pre-loaded image');
    
    try {
      // Use the new DialogService method to open AI with pre-loaded image (now async)
      const dialogRef = await this.dialogService.openSymbolCreatorAIWithImage(result);
      
      dialogRef.afterClosed().subscribe((mediaItem: Media) => {
        if (mediaItem) {
          console.log('[SearchPanel] AI Dialog closed with media:', mediaItem.id);
          this.mediaUpdateService.triggerUpdate(mediaItem);
        } else {
          console.log('[SearchPanel] AI Dialog cancelled');
        }
      });
      
    } catch (error) {
      console.error('[SearchPanel] Failed to open AI designer with image:', error);
    }
  }

  private logDataMappingValidation(result: SymbolSearchResult) {
    console.log('[SearchPanel] === DATA MAPPING VALIDATION ===');
    
    // 1. SymbolSearchResult → Cell mapping
    console.log('1. SymbolSearchResult → Cell mapping:');
    const cellMapping = {
      'result.imageUrl': '→ cell.image_url',
      'result.label': '→ cell.caption', 
      'result.pictoId': '→ cell.picto_id',
      'result.picto': '→ cell.picto',
      'result.id': '→ ? (no direct Cell equivalent)',
      'result.tooltip': '→ ? (could use for caption fallback)'
    };
    console.table(cellMapping);
    
    // 2. SymbolSearchResult → ImageUploadResult mapping
    console.log('2. SymbolSearchResult → ImageUploadResult conversion:');
    console.log('  Input: result.imageUrl =', result.imageUrl);
    console.log('  Required steps:');
    console.log('    a) Fetch image from URL');
    console.log('    b) Convert to Blob/File');
    console.log('    c) Generate base64 encoding'); 
    console.log('    d) Create preview data URL');
    console.log('    e) Extract image dimensions');
    console.log('    f) Build ImageUploadResult object');
    
    // 3. Missing data identification
    console.log('3. Missing data/compatibility issues:');
    const issues = [];
    if (!result.imageUrl) issues.push('Missing imageUrl');
    if (!result.label) issues.push('Missing label for caption');
    if (result.imageUrl && !result.imageUrl.match(/\.(jpg|jpeg|png|gif|svg)$/i)) {
      issues.push('Image URL may not have standard extension');
    }
    
    if (issues.length === 0) {
      console.log('  ✓ No immediate compatibility issues detected');
    } else {
      console.log('  ⚠ Issues found:', issues);
    }
    
    console.log('[SearchPanel] === END VALIDATION ===');
  }

  
openSymbolCreator() {
    const currentDialogRef = this.dialogService.openSymbolCreator();
    currentDialogRef.afterClosed().subscribe((mediaItem: Media) => {
      if (mediaItem) {
        this.mediaUpdateService.triggerUpdate(mediaItem); // Use service instead of mediaCreated
        console.log('Symbol Creator dialog closed', mediaItem);
      }
    });
  }

  openSymbolCreatorAI() {
    const currentDialogRef = this.dialogService.openSymbolCreatorAI();
    
    currentDialogRef.componentInstance.parentDialogRef = currentDialogRef; // Pass the dialog reference to PromptModeComponent
    currentDialogRef.afterClosed().subscribe((mediaItem: Media) => {
      if (mediaItem) {
        this.mediaUpdateService.triggerUpdate(mediaItem); // Use service instead of mediaCreated
        console.log('SCAI dialog closed', mediaItem);
      }
    });
  }
  
}

interface FlatGsParam<T> {
  value: string;
  options: Array<T>;
}

interface GroupedGsParam<T> {
  value: string;
  groups: Array<{name: string, options: Array<T>}>;
}
