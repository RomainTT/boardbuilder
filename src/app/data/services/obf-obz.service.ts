import {Injectable} from '@angular/core';
import {Board} from '@data/models/board.model';
import * as JSZip from 'jszip';
import {BoardSet} from '@data/models/boardset.model';
import {MediaService} from '@data/services/media.service';
import {Observable, from} from 'rxjs';
import {switchMap} from 'rxjs/operators';
import {BoardSetService} from '@data/services/board-set.service';
import {BoardService} from '@data/services/board.service';
import {Obf} from '@data/models/obf.interface';
import {$localize} from '@angular/localize/init';

interface UploadedImageMap {
  originalId: string;
  url: string;
}

@Injectable({
  providedIn: 'root'
})
export class ObfObzService {

  constructor(private mediaService: MediaService,
              private boardSetService: BoardSetService,
              private boardService: BoardService) { }

  // Parses an OBF object to a Board. Does not upload embedded images.
  public parseObf(obf: Obf, boardSet?: BoardSet): Board {
    const board = new Board();
    board.fromObf(obf);
    if (boardSet) { board.board_set_id = boardSet.id; }
    return board;
  }

  // Parses an OBZ file to a BoardSet containing Boards. Does not upload embedded images.
  public parseObz(file): Promise<BoardSet> {
    const boardSet = new BoardSet();
    boardSet.boards = [];

    // Try to open the zip file
    return JSZip.loadAsync(file).then(zip => {

      // Check the manifest file exists
      if (!zip.file('manifest.json')) {
        throw new Error($localize`:obz upload error no manifest:it does not contain a manifest.json file.`);
      }

      // Try to open the manifest file
      return zip.file('manifest.json').async('string').then(data => {
        let manifest: any;
        
        if (!data || data.length === 0) {
          throw new Error($localize`:obz upload error bad manifest:the manifest.json file is empty.`);
        }
        
        try {
          manifest = JSON.parse(data);
        } catch (parseError: any) {
          console.error('JSON parse error:', parseError, 'Data:', data.substring(0, 200));
          const parseErrorMessage = parseError.message || String(parseError);
          const baseMessage = $localize`:obz upload error bad manifest:the manifest.json file contains invalid JSON.`;
          throw new Error(baseMessage + ' ' + parseErrorMessage);
        }

        // Create a new BoardSet using the OBZ filename as the title
        boardSet.title = file.name;

        // Validate manifest structure with detailed error messages
        if (!manifest) {
          throw new Error($localize`:obz upload error bad manifest:the manifest.json file is invalid or empty.`);
        }
        
        // Support both formats:
        // 1. New format with paths.boards object
        // 2. Legacy format with single root board file
        let boardPromises: Promise<Board>[];
        
        if (manifest.paths && manifest.paths.boards) {
          // New format: paths.boards object
          if (typeof manifest.paths.boards !== 'object' || Array.isArray(manifest.paths.boards)) {
            console.error('Manifest paths.boards structure:', manifest.paths.boards);
            throw new Error($localize`:obz upload error bad manifest:the manifest.json file 'paths.boards' property must be an object, not an array.`);
          }
          
          if (Object.keys(manifest.paths.boards).length === 0) {
            throw new Error($localize`:obz upload error bad manifest:the manifest.json file 'paths.boards' object is empty.`);
          }

          // From the manifest, get the path of each OBF file.
          // The list of OBF files is stored as an object {}, so we have to use Object.entries
          boardPromises = Object.entries(manifest.paths.boards).map((board) => {

            // The key is the ID of the OBF, used for referencing when linking Boards.
            const obfId = board[0];
            // The value is the OBF path and filename within the zip file.
            const obfFilename = board[1].toString();

            // Check the OBF file exists within the zip.
            if (!zip.file(obfFilename)) {
              throw new Error($localize`:obz upload error file missing:${obfFilename} is missing.`);
            }

            // Access the OBF file, unpack it to a Board and save it into the BoardSet.
            return zip.file(obfFilename).async('binarystring').then(obf => {
              // Prepare a new Board, build it from the OBF and push it to the BoardSet.
              return this.parseObf(JSON.parse(obf));
            });
          });
        } else if (manifest.root) {
          // Legacy format: single root board file
          const rootFilename = manifest.root.toString();
          
          // Check the root OBF file exists within the zip.
          if (!zip.file(rootFilename)) {
            throw new Error($localize`:obz upload error file missing:${rootFilename} is missing.`);
          }

          // Access the root OBF file, unpack it to a Board
          boardPromises = [
            zip.file(rootFilename).async('binarystring').then(obf => {
              return this.parseObf(JSON.parse(obf));
            })
          ];
        } else {
          // Neither format found
          const manifestKeys = Object.keys(manifest).join(', ');
          console.error('Manifest structure:', JSON.stringify(manifest, null, 2));
          const baseMessage = $localize`:obz upload error bad manifest:the manifest.json file does not contain a 'paths' property or 'root' property.`;
          const detailMessage = manifestKeys ? ` Found properties: ${manifestKeys}` : ' No properties found.';
          throw new Error(baseMessage + detailMessage);
        }

        // Wait for all boards to be parsed before returning
        return Promise.all(boardPromises).then(boards => {
          boardSet.boards = boards;
          return boardSet;
        });

      }).catch(error => {
        console.error('Error reading manifest.json:', error);
        // Preserve the original error message if it's already a meaningful error
        if (error.message && error.message.includes('obz upload error')) {
          throw error;
        }
        // Otherwise, provide a more informative error message
        const errorMessage = error.message || String(error);
        const baseMessage = $localize`:obz upload error bad manifest:the manifest.json file could not be read.`;
        throw new Error(baseMessage + ' ' + errorMessage);
      });

    }).catch(error => {
      if (error.message && error.message.includes('manifest')) {
        throw error;
      }
      throw new Error($localize`:obz upload error corrupt zip:it is corrupted (could not read ZIP).`);
    });
  }

  // Uploads a BoardSet from an OBZ file, including embedded images.
  public uploadObz(file): Observable<BoardSet> {
    return from(this.parseObz(file)).pipe(
      switchMap(boardSet => this.boardSetService.add(boardSet))
    );
  }
}
