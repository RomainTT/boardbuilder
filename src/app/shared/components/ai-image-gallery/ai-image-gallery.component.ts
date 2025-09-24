import { Component, Input, Output, EventEmitter, OnDestroy, OnInit, NgZone } from '@angular/core';
import { trigger, transition, style, animate, AnimationEvent } from '@angular/animations';
import { GalleryState, ErrorState, AiSymbolStateService } from '@data/services/ai-symbol-state.service';
import { timer, Subscription, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-ai-image-gallery',
  templateUrl: './ai-image-gallery.component.html',
  styleUrls: ['./ai-image-gallery.component.scss'],
  animations: [
    trigger('expand', [
      transition(':enter', [
        style({ height: '0px', overflow: 'hidden' }),
        animate('800ms cubic-bezier(0.4, 0.0, 0.2, 1)', style({ height: '170px', overflow: 'visible' })),
      ]),
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('600ms ease-in', style({ opacity: 1 })),
      ]),
    ]),
  ]
})
export class AiImageGalleryComponent implements OnInit, OnDestroy {
  @Input() galleryState: GalleryState | null = null;
  @Input() errorState: ErrorState | null = null;

  @Output() imageSelected = new EventEmitter<number>();
  @Output() expandDone = new EventEmitter<AnimationEvent>();
  @Output() retryRequested = new EventEmitter<void>();

  private destroy$ = new Subject<void>();
  private progressSubscriptions: Subscription[] = [];
  private wasLoading = false;
  private generationStarted = false;
  progressBars: number[] = [0, 0, 0, 0];

  constructor(private stateService: AiSymbolStateService, private ngZone: NgZone) {}

  ngOnInit() {
    // Watch for loading state changes to start/stop progress bars
    this.stateService.galleryState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(galleryState => {
        // keep local progress bars in sync for template binding
        if (galleryState.progressBars && galleryState.progressBars !== this.progressBars) {
          this.progressBars = [...galleryState.progressBars];
        }
        const prevWasLoading = this.wasLoading;
        this.wasLoading = galleryState.isLoading;
        const loadingStarted = !prevWasLoading && galleryState.isLoading;

        if (loadingStarted) {
          // Reset progress bars to 0 and start them when loading starts
          this.generationStarted = true;
          this.stateService.setProgressBars([0, 0, 0, 0]);
          this.startProgressBars();
        } else if (!galleryState.isLoading && this.generationStarted && galleryState.progressBars.some(progress => progress < 100)) {
          // Complete progress bars when loading finishes, but only if generation started and they're not already completed
          this.completeProgressBars();
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearProgressSubscriptions();
    this.generationStarted = false;
  }

  private startProgressBars() {
    // Clear any existing progress subscriptions
    this.clearProgressSubscriptions();

    // Start each progress bar with a 2 second delay, then 5 second duration
    // Image 1: starts at 2s, completes at 7s
    // Image 2: starts at 3s, completes at 8s
    // Image 3: starts at 4s, completes at 9s
    // Image 4: starts at 5s, completes at 10s

    for (let i = 0; i < 4; i++) {
      const startDelay = 2500 + (i * 2400); // 2s, 3s, 4s, 5s
      const duration = 11000; // 5 seconds

      // Use setTimeout to start after delay, then setInterval for updates
      const timeoutId = this.ngZone.runOutsideAngular(() => {
        return setTimeout(() => {
          const startTime = Date.now();
          const intervalId = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min((elapsed / duration) * 100, 100);
            // update local first for immediate visual change
            this.progressBars = this.progressBars.map((v, idx) => idx === i ? progress : v);
            // Only propagate to global state in coarse steps to avoid recursive storms
            const rounded = Math.round(progress);
            if (rounded % 5 === 0) {
              this.ngZone.run(() => this.stateService.updateProgressBar(i, rounded));
            }

            if (progress >= 100) {
              clearInterval(intervalId);
            }
          }, 100); // Update every 100ms

          // Store the interval ID for cleanup
          this.progressSubscriptions.push({
            unsubscribe: () => {
              clearInterval(intervalId);
            }
          } as Subscription);
        }, startDelay);
      });

      // Store the timeout ID for cleanup
      this.progressSubscriptions.push({
        unsubscribe: () => {
          clearTimeout(timeoutId);
        }
      } as Subscription);
    }
  }

  private completeProgressBars() {
    // Complete all progress bars immediately
    this.stateService.setProgressBars([100, 100, 100, 100]);
    this.clearProgressSubscriptions();
  }

  private clearProgressSubscriptions() {
    this.progressSubscriptions.forEach(sub => sub.unsubscribe());
    this.progressSubscriptions = [];
  }

  selectImage(index: number) {
    this.imageSelected.emit(index);
  }

  onExpandDone(event: AnimationEvent) {
    this.expandDone.emit(event);
  }

  onRetry() {
    this.retryRequested.emit();
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }
}