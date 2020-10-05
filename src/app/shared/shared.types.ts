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
  [extraOption: string]: any
}

export interface Texts {
  [text: string]: LocalizedString
}