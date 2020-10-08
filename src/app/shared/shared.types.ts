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