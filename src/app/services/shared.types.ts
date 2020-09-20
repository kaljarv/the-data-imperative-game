export const ONBOARDING_NOT_AVAILABLE = 0;
export const ONBOARDING_NEEDED = 1;
export const ONBOARDING_ACTIVE = 2;
export const ONBOARDING_COMPLETE = 3;
export const ONBOARDING_REACTIVATED = 4;

export interface LocalizedString {
  [locale: string]: string
}

export interface InvestmentId extends Number {
}

/*
 * TODO Make stronger types for Investment categories separate from Investments
 */
export interface Investment {
  id: InvestmentId,
  title: LocalizedString,
  longTitle?: LocalizedString,
  description?: LocalizedString,
  children?: Array<Investment>,
  price?: number,
  returns?: number,
  onboardingStatus?: number, // See consts above
  active?: boolean, // The following are used by the game engine not settings
  parent?: Investment,
}

export interface InvestmentCombo {
  investments: Array<InvestmentId>,
  description: LocalizedString,
  returns: number
}

export interface Settings {
  version: number,
  balance: number,
  rounds: number,
  investments: Investment,
  investmentCombos: Array<InvestmentCombo>,
  [extraOption: string]: any
}

export interface Texts {
  [text: string]: LocalizedString
}