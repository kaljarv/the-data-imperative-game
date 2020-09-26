import { Component,
         OnInit } from '@angular/core';

import { SharedService} from '../../services';

@Component({
  selector: 'app-title-screen',
  templateUrl: './title-screen.component.html',
  styleUrls: ['./title-screen.component.sass']
})
export class TitleScreenComponent implements OnInit {

  constructor(
    private shared: SharedService
  ) { }

  ngOnInit(): void {
  }

  public t(text: string): string {
    return this.shared.getText(text);
  }

  public bookPromoClick(event: Event): void {
    window.open(this.shared.settings.bookUrl, "_blank");
    if (event)
      event.stopPropagation();
  }
}
