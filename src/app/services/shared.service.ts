import { Inject,
         Injectable,
         LOCALE_ID } from '@angular/core';

import { LocalizedString,
         Settings,
         Texts } from './shared.types';

import settings from '../../assets/data/settings.json';
import texts from '../../assets/data/texts.json';

const DEFAULT_LOCALE = 'en-US';

@Injectable({
  providedIn: 'root'
})
export class SharedService {
  public settings: Settings;
  public texts: Texts;

  constructor(
    @Inject(LOCALE_ID) public locale: string
  ) {
    this.settings = settings;
    this.texts = texts;
  }

  /*
   * Return the prompt text in current locale or the text itself if that's not available.
   * If text is a localized string, select the correct localized version or use the default.
   */
  public getText(text: string | LocalizedString): string {
    if (text == null) {
      return "";
    } else if (typeof text === "string") {
      return this.texts[text]?.[this.locale] ?? text;
    } else {
      return text[this.locale] ?? text[DEFAULT_LOCALE];
    }
  }
}
