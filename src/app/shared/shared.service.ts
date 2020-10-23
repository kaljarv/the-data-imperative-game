import { EventEmitter,
         Inject,
         Injectable,
         LOCALE_ID,
         SecurityContext } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer,
         SafeHtml } from '@angular/platform-browser';
import { BehaviorSubject,
         forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';

import { LocalizedString,
         Settings,
         Texts } from './shared.types';
import { Investment, 
         InvestmentCategory, 
         InvestmentCombo, 
         InvestmentRoot } from './investment.types';

export const ANIMATION_DURATION_MS: number = 225;
export const ANIMATION_DURATION: string = ANIMATION_DURATION_MS + 'ms';
export const ANIMATION_TIMING: string = `${ANIMATION_DURATION} cubic-bezier(0.4, 0, 0.2, 1)`;
export const ANIMATION_TIMING_DELAYED: string = `${ANIMATION_DURATION} ${ANIMATION_DURATION} cubic-bezier(0.4, 0, 0.2, 1)`;
export const DEFAULT_LOCALE = 'en-US';
const SETTINGS_URL = 'assets/data/settings.json';
const TEXTS_URL = 'assets/data/texts.json';

@Injectable({
  providedIn: 'root'
})
export class SharedService {
  public investments: InvestmentRoot;
  public investmentCombos: Array<InvestmentCombo>;
  public ready = new BehaviorSubject<boolean>(false);
  public error = new EventEmitter<string>();
  public settings: {
    version: number,
    balance: number,
    rounds: number,
    bookUrl: string,
    sentimentOptions: {
      neutralReturnsRange: [number, number],
      comboCompletionBonus: number,
    },
  };
  public texts: Texts;

  constructor(
    private http: HttpClient,
    @Inject(LOCALE_ID) public locale: string,
    private sanitizer: DomSanitizer,
  ) {
    this.loadData();
  }

  public loadData(): void {
    forkJoin([
      this.http.get<Settings>(SETTINGS_URL).pipe(
        map(d => {
          this.processSettings(d);
          return true;
        })
      ), 
      this.http.get<Texts>(TEXTS_URL).pipe(
        map(d => {
          this.texts = d;
          return true;
        })
      ), 
    ]).subscribe(_ => this.ready.next(true));
  }

  /*
   * Process the whole settings json object
   */
  public processSettings(settings: Settings): void {
    this.settings = {
      version: settings.version,
      balance: settings.balance,
      rounds:  settings.rounds,
      bookUrl: settings.bookUrl,
      sentimentOptions: settings.sentimentOptions
    };
    this.investments = this.processInvestmentsJson(settings.investments);
    this.investmentCombos = this.processInvestmentCombosJson(settings.investmentCombos);
  }

  /*
   * Create proper objects from settings.json
   */
  public processInvestmentsJson(data: Array<any>): InvestmentRoot {
    const root = new InvestmentRoot();
    data.forEach(c => {
      let catNode = new InvestmentCategory(
        c.id,
        c.title,
        root,
        c.description,
        c.onboardingStatus
      );
      c.children?.forEach(s => {
        let subNode = new InvestmentCategory(
          s.id,
          s.title,
          catNode
        );
        s.children.forEach(i => {
          let invNode = new Investment(
            i.id,
            i.title,
            subNode,
            i.description,
            i.price,
            i.returns,
            i.longTitle
          );
        });
      })
    });
    return root;
  }

  public processInvestmentCombosJson(data: Array<any>): Array<InvestmentCombo> {
    return data.map(c => new InvestmentCombo(
      c.investments,
      c.description,
      c.returns
    ));
  }

  /*
   * Return the prompt text in current locale or the text itself if that's not available.
   * If text is a localized string, select the correct localized version or use the default.
   * Note that if the text is to contain any HTML markup, it should be used as a bound
   * property, i.e., <span [innerHTML]="shared.getText('Text')"></span>. It will be 
   * sanitized by Angular but basic formatting and links are allowed, at least.
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
