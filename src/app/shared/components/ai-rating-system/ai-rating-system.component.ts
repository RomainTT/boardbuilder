import { Component, Input, Output, EventEmitter } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-ai-rating-system',
  templateUrl: './ai-rating-system.component.html',
  styleUrls: ['./ai-rating-system.component.scss'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('600ms ease-in', style({ opacity: 1 })),
      ]),
    ]),
    trigger('fadeInDetailed', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('600ms ease-in', style({ opacity: 1 })),
      ]),
    ]),
  ]
})
export class AiRatingSystemComponent {
  @Input() rating: number = 0;
  @Input() promptAccuracy: number = 0;
  @Input() styleAccuracy: number = 0;
  @Input() showDetailedRatings: boolean = false;

  @Output() ratingChanged = new EventEmitter<number>();
  @Output() promptAccuracyChanged = new EventEmitter<number>();
  @Output() styleAccuracyChanged = new EventEmitter<number>();

  setRating(value: number) {
    this.ratingChanged.emit(value);
  }

  setPromptAccuracy(value: number) {
    this.promptAccuracyChanged.emit(value);
  }

  setStyleAccuracy(value: number) {
    this.styleAccuracyChanged.emit(value);
  }
}