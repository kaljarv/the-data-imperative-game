/*
 * Note that the strings may contain HTML markup, too. Such text will be 
 * sanitized by Angular but basic formatting and links are allowed, at least.
 */
export interface LocalizedString {
  [locale: string]: string
}

export interface Settings {
  version: number,
  balance: number,
  rounds: number,
  bookUrl: string,
  investments: Array<any>,
  investmentCombos: Array<any>,
  sentimentOptions: {
    neutralReturnsRange: [number, number],
    comboCompletionBonus: number,
  },
  [extraOption: string]: any
}

export interface Texts {
  [text: string]: LocalizedString
}