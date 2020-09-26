import { Inject,
         Injectable,
         LOCALE_ID } from '@angular/core';

import { LocalizedString,
         Texts } from './shared.types';
import { Investment, 
         InvestmentCategory, 
         InvestmentCombo, 
         InvestmentRoot } from './investment.types';

import settings from '../../assets/data/settings.json';
import texts from '../../assets/data/texts.json';


/*
 * TODO

Convert settings to interfaces
Process settings
Convert types in game.comp
Move to methods

 */

const DEFAULT_LOCALE = 'en-US';

@Injectable({
  providedIn: 'root'
})
export class SharedService {
  public settings: {
    version: number,
    balance: number,
    rounds: number,
    bookUrl: string,
  };
  public texts: Texts;
  public investments: InvestmentRoot;
  public investmentCombos: Array<InvestmentCombo>;

  constructor(
    @Inject(LOCALE_ID) public locale: string
  ) {
    this.settings = {
      version: settings.version,
      balance: settings.balance,
      rounds:  settings.rounds,
      bookUrl: settings.bookUrl,
    };
    this.texts = texts;
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
