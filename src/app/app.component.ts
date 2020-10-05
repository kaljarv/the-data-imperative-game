import { Component } from '@angular/core';
import { trigger,
         style,
         animate,
         transition } from '@angular/animations';

import { ANIMATION_TIMING,
         SharedService} from './shared/shared.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.sass'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({
          opacity: 0,
        }),
        animate(ANIMATION_TIMING, style({
          opacity: 1,
        })),
      ]),
      transition(':leave', [
        style({
          opacity: 1,
        }),
        animate(ANIMATION_TIMING, style({
          opacity: 0,
        })),
      ]),
    ]),
  ],
})
export class AppComponent {
  public isLoading: boolean = true;

  constructor(
    private shared: SharedService
  ) {
    this.shared.ready.subscribe(value => {
      this.isLoading = !value;
    });
  }
}
