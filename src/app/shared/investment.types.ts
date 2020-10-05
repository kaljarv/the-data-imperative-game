import { LocalizedString } from './shared.types';

export const INVESTMENT_ROOT_ID = -1;
export const NULL_INVESTMENT_ID = -2;
export const ONBOARDING_NOT_AVAILABLE = 0;
export const ONBOARDING_NEEDED = 1;
export const ONBOARDING_ACTIVE = 2;
export const ONBOARDING_COMPLETE = 3;
export const ONBOARDING_REACTIVATED = 4;

export interface InvestmentId extends Number {
}

/*
 * The root class for all Investments
 */
export abstract class InvestmentNode {
  protected _active: boolean = false;

  constructor(
    public id: InvestmentId,
    public title: LocalizedString,
    public parent: InvestmentCategory = null,
    public description: LocalizedString = null,
  ) {
    if (parent)
      parent.children.push(this);
  }

  public get root(): InvestmentCategory {
    if (this.parent) {
      return this.parent.root;
    } else if (this instanceof InvestmentCategory) {
      return this;
    } else {
      return null;
    }
  }

  /*
   * Fetch active status from self or descendants
   */
  public get active(): boolean {
    if (this._active)
      return true;
    if (this instanceof InvestmentCategory) {
      for (let i = 0; i < this.children.length; i++) {
        if (this.children[i].active)
          return true;
      }
    }
    return false;
  }

  /*
   * Only one node can be truly _active at once,
   * so we clear the active status from all other nodes if the value is true, 
   * and propagate it to descendants if false
   */
  public set active(value: boolean) {
    if (value === true) {
      this.root.descendants.filter(d => d !== this).forEach(d => d._active = false);
      this._active = true;
    } else {
      if (this instanceof InvestmentCategory)
        this.children.forEach(d => d.active = false);
      this._active = false;
    }
  }

}

/*
 * Investment categories
 */
export class InvestmentCategory extends InvestmentNode {
  public children = new Array<InvestmentNode>();
  private _originalOnboardingStatus: number;

  constructor(
    id: InvestmentId,
    title: LocalizedString,
    parent: InvestmentCategory,
    description: LocalizedString = null,
    public onboardingStatus: number = ONBOARDING_NOT_AVAILABLE
  ) {
    super(id, title, parent, description);
    this._originalOnboardingStatus = onboardingStatus;
  }

  public get isTopLevel(): boolean {
    return this.parent instanceof InvestmentRoot;
  }

  /*
   * Check if this category's children are investments
   */
  public get isBottomLevel(): boolean {
    return this.children?.[0] instanceof InvestmentNode;
  }

  /*
   * CHILDREN AND DESCENDANTS
   */

  public get hasChildren(): boolean {
    return this.children.length > 0;
  }

  public get descendants(): Array<InvestmentNode> {
    return this.getDescendants();
  }

  public get investments(): Array<Investment> {
    return this.descendants.filter(i => i instanceof Investment) as Array<Investment>;
  }

  public get purchases(): Array<Investment> {
    return this.investments.filter(i => i.purchased)
                           .sort((a, b) => a.purchasedOnRound - b.purchasedOnRound);
  }

  public get categories(): Array<InvestmentCategory> {
    return this.descendants.filter(i => i instanceof InvestmentCategory) as Array<InvestmentCategory>;
  }

  /*
   * If maxDepth is not null, recursion will not progress further than that with 0 yielding children only
   */
  public getDescendants(maxDepth: number = null): Array<InvestmentNode> {
    let list = new Array<InvestmentNode>();
    this.children.forEach(c => {
      list.push(c);
      if (c instanceof InvestmentCategory && (maxDepth == null || maxDepth - 1 < 0))
        list = list.concat(c.getDescendants(maxDepth == null ? null : maxDepth - 1));
    });
    return list;
  }

  public getDescendantById(id: InvestmentId): InvestmentNode {
    let list = this.descendants.filter(i => i.id === id);
    return list[0] ?? null;
  }

  /*
   * ONBOARDING
   */
  public get needsOnboarding(): boolean {
    return this.onboardingStatus === ONBOARDING_NEEDED;
  }

  public get isOnboarded(): boolean {
    return this.onboardingStatus === ONBOARDING_COMPLETE || this.onboardingStatus === ONBOARDING_REACTIVATED;
  }

  public get onboardingActive(): boolean {
    return this.onboardingStatus === ONBOARDING_ACTIVE || this.onboardingStatus === ONBOARDING_REACTIVATED;
  }

  public get onboardingAvailable(): boolean {
    return this.onboardingStatus === ONBOARDING_NEEDED || this.onboardingStatus === ONBOARDING_COMPLETE;
  }

  public activateOnboarding(): void {
    this.onboardingStatus = ONBOARDING_ACTIVE;
  }

  public completeOnboarding(): void {
    this.onboardingStatus = ONBOARDING_COMPLETE;
  }

  public resetOnboarding(): void {
    this.onboardingStatus = this._originalOnboardingStatus;
  }


}

/*
 * The root node for investments
 */
export class InvestmentRoot extends InvestmentCategory {
  // We store passed rounds inelegantly here so as to keep all data within the investment tree
  public passedRounds = new Array<NullInvestment>();

  constructor() {
    super(INVESTMENT_ROOT_ID, null, null);
  }

  public pass(round: number): void {
    this.passedRounds.push(new NullInvestment(round));
  }

  public get purchasesAndPassedRounds(): Array<Investment> {
    return this.investments.filter(i => i.purchased)
                           .concat(this.passedRounds)
                           .sort((a, b) => a.purchasedOnRound - b.purchasedOnRound);
  }

  /*
   * Reset the whole tree to initial values
   * Call this before loading a state from url params
   */
  public reset(resetOnboarding: boolean = false): void {
    this.descendants.forEach(i => {
      i.active = false;
      if (resetOnboarding && i instanceof InvestmentCategory)
        i.resetOnboarding();
      if (i instanceof Investment)
        i.depurchase();
    });
    this.passedRounds = [];
  }
}

/*
 * Investments per se
 */
export class Investment extends InvestmentNode {
  public purchasedOnRound: number = null;
  protected _longTitle: LocalizedString;

  constructor(
    id: InvestmentId,
    title: LocalizedString,
    parent: InvestmentCategory,
    description: LocalizedString = null,
    public price: number,
    public returns: number = 0,
    longTitle?: LocalizedString,
  ) {
    super(id, title, parent, description);
    if (longTitle)
      this.longTitle = longTitle;
  }

  public get purchased(): boolean {
    return this.purchasedOnRound != null;
  }

  public purchase(round: number): void {
    this.purchasedOnRound = round;
  }

  public depurchase(): void {
    this.purchasedOnRound = null;
  }

  public get longTitle(): LocalizedString {
    return this._longTitle ?? this.title;
  }

  public set longTitle(value: LocalizedString)  {
    this._longTitle = value;
  }
}

/*
 * A special class to handle passed rounds
 */
export class NullInvestment extends Investment {
  constructor(
    round: number
  ) {
    super(NULL_INVESTMENT_ID, null, null, null, 0, 0);
    this.purchase(round);
  }
}

/*
 * Investment combinations
 */
export class InvestmentCombo {
  constructor(
    public investments: Array<InvestmentId>,
    public description: LocalizedString,
    public returns: number
  ) {}

  /*
   * Test how many investements are missing from the combo
   */
  public countMissing(investments: Array<Investment>): number {
    const ids = investments.map(i => i.id);
    let missing = this.investments.length;
    for (let i = 0; i < this.investments.length; i++) {
      if (ids.includes(this.investments[i]))
        missing -= 1;
    }
    return missing;
  }

  /*
   * Test the combo against purchases and return returns if combo is applicable or 0 if not.
   */
  public apply(investments: Array<Investment>): number {
    return this.countMissing(investments) === 0 ? this.returns : 0;
  }

}