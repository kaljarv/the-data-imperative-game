import { Component, 
         OnDestroy,
         OnInit } from '@angular/core';
import { ActivatedRoute,
         NavigationEnd,
         Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';


import { Investment,
         InvestmentCategory,
         InvestmentCombo,
         InvestmentId,
         InvestmentNode,
         InvestmentRoot,
         LocalizedString,
         NULL_INVESTMENT_ID,
         ONBOARDING_NEEDED,
         ONBOARDING_ACTIVE,
         ONBOARDING_COMPLETE,
         ONBOARDING_REACTIVATED,
         SharedService } from '../../services';

const DATA_KEY_VERSION = 'v';
const DATA_KEY_ONBOARDED = 'o';
const DATA_KEY_PURCHASES = 'p';
const DATA_SEPARATOR = ',';
const ROUND_BASE = 1;
const AVATAR_IMAGES = {
  '-1': '/assets/images/avatar-worried.png',
   '0': '/assets/images/avatar-neutral.png',
   '1': '/assets/images/avatar-happy.png',
   '2': '/assets/images/avatar-extatic.png',
};

/*
 * For convenience
 */
function sum(arr: Array<number>): number {
  return arr.reduce((a, b) => a + b, 0);
}

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.sass'],
  host: {
    "(click)": "hideInvestments()"
  }
})
export class GameComponent implements OnDestroy, OnInit {
  // Options (TODO allow setting dynamically)
  public options = {
    hideOnPurchase: true,
    autoShowOnlyChild: true,
    pipeFlowScale: 100
  };
  public adviceHidden: boolean = false;
  public investmentCombos: Array<InvestmentCombo>;
  public investmentRoot: InvestmentRoot;
  private _preloaded = new Array<any>();
  private _subscriptions = new Array<Subscription>();

  constructor(
    private route:  ActivatedRoute,
    private router: Router,
    private shared: SharedService
  ) {
    this.investmentRoot = this.shared.investments;
    this.investmentCombos = this.shared.investmentCombos;
    this.resetState();
  }

  ngOnInit(): void {
    this.readParams();
    // We need to explicitly read the params whenever navigating
    // as onInit won't be called while we stay on the same page
    this._subscriptions.push(
      this.router.events.pipe(
        filter(evt => evt instanceof NavigationEnd)
      ).subscribe(() => this.readParams())
    );
    // Preload images
    for (let url in AVATAR_IMAGES) {
      const img = new Image();
      img.src = AVATAR_IMAGES[url];
      this._preloaded.push(img);
    }
  }

  ngOnDestroy(): void {
    this._subscriptions.forEach(s => s.unsubscribe());
  }

  /**************************************
   * USER ACTIONS                       *
   **************************************/

  public categoryClick(category: InvestmentCategory, event: Event = null): void {
    if (category.needsOnboarding) {
      this.startOnboarding(category, event);
    }
    // Disable background click if this investment is active,
    // otherwise bg click is okay
    if (event && category.active)
      event.stopPropagation();
  }

  public startOnboarding(category: InvestmentCategory, event: Event = null): void {
    if (category.onboardingAvailable) {
      this.hideInvestments();
      category.activateOnboarding();
    }
    // To disable background click
    if (event)
      event.stopPropagation();
  }

  public closeOnboarding(category: InvestmentCategory, event?: Event): void {
    this.hideInvestments();
    category.completeOnboarding();
    this.updateUrl();
    // To disable background click
    if (event)
      event.stopPropagation();
  }

  /*
   * Open a subcategory or an investment
   */
  public show(node: InvestmentNode, event?: Event): void {
    // If we are showing and investment with only one child, propagate showing to that
    if (this.options.autoShowOnlyChild && node instanceof InvestmentCategory && node.children.length === 1) {
      this.show(node.children[0], event);
    } else {
      // Set this one as active
      node.active = true;
    }
    // Hide advice
    this.setAdviceHidden(true);
    // To disable background click
    if (event)
      event.stopPropagation();
  }

  /*
   * Purchase an investment or pass a round if no investment is specfied.
   */
  public purchase(investment?: Investment, event?: Event): void {
    if (this.options.hideOnPurchase)
      this.hideInvestments();
    if (investment) {
      investment.purchase(this.round);
    } else {
      this.investmentRoot.pass(this.round);
    }
    this.updateUrl();
    this.startRound();
    // To disable background click
    if (event)
      event.stopPropagation();
  }

  public pass(event?: Event): void {
    this.purchase(null, event);
  }

  public startOver(event?: Event): void {
    // TODO Add confirmation
    this.hideInvestments();
    this.resetState();
    this.updateUrl();
    this.startRound();
    // To disable background click
    if (event)
      event.stopPropagation();
  }

  public toggleAdvice(event?: Event): void {
    this.adviceHidden = !this.adviceHidden;
    // To disable background click
    if (event)
      event.stopPropagation();
  }

  public setAdviceHidden(hide: boolean = true, event?: Event): void {
    this.adviceHidden = hide;
    // To disable background click
    if (event)
      event.stopPropagation();
  }

  public catchClick(event: Event): void {
    event.stopPropagation();
  }

  /**************************************
   * URL PARAMS                         *
   **************************************/

  public updateUrl(): void {
    // We use router to save the game data between sessions
    this.router.navigate([{
      [DATA_KEY_VERSION]:   this.shared.settings.version,
      [DATA_KEY_ONBOARDED]: this._encodeIds(this.investmentRoot.categories.filter(c => c.isOnboarded).map(c => c.id)),
      [DATA_KEY_PURCHASES]: this._encodeIds(this.purchasesAndPassedRounds.map(p => p.id))
    }]);
  }

  public readParams(): void {
    // Reset first
    this.resetState();
    // Only load purchases from route data if the application versions match
    // Otherwise reset the state to handle the going back to an url without params
    if (this.route.snapshot.params?.[DATA_KEY_VERSION] && 
      this.route.snapshot.params[DATA_KEY_VERSION] == this.shared.settings.version) {
      if (this.route.snapshot.params[DATA_KEY_PURCHASES]) {
        const purchases = this._decodeIds(this.route.snapshot.params[DATA_KEY_PURCHASES]);
        for (let i = 0; i < purchases.length; i++) {
          const round = i + ROUND_BASE;
          if (purchases[i] === NULL_INVESTMENT_ID) {
            this.investmentRoot.pass(round);
          } else {
            this.getInvestment(purchases[i]).purchase(round);
          }
        }
      }
      if (this.route.snapshot.params[DATA_KEY_ONBOARDED]) {
        let ids = this._decodeIds(this.route.snapshot.params[DATA_KEY_ONBOARDED]);
        this.investmentRoot.categories.filter(c => ids.includes(c.id))
                                      .forEach(c => c.completeOnboarding());
      }
    }
    // This resets the screen
    this.startRound();
  }

  private _encodeIds(list: Array<InvestmentId>): string {
    return list.join(DATA_SEPARATOR);
  }
  private _decodeIds(text: string): Array<InvestmentId> {
    return text.split(DATA_SEPARATOR).map(s => parseInt(s));
  }

  public startRound(): void {
    this.adviceHidden = false;
  }

  public resetState(): void {
    this.investmentRoot.reset();
  }

  /**************************************
   * OTHER METHODS                      *
   **************************************/

  public get investmentCategories(): Array<InvestmentCategory> {
    return this.investmentRoot.children as Array<InvestmentCategory>;
  }

  public get balance(): number {
    return this.shared.settings.balance - this.spentBalance + this.accumulatedReturns;
  }

  public get spentBalance(): number {
    // We include passed rounds here, as we might defined a cost for passing a round
    return sum(this.purchasesAndPassedRounds.map(p => p.price));
  }

  /*
   * Note that round is ROUND_BASE-based (= 1)
   */
  public get round(): number {
    return this.purchasesAndPassedRounds.length + ROUND_BASE;
  }
  
  public get roundsLeft(): number {
    return this.shared.settings.rounds - this.round;
  }

  public get returns(): number {
    return this.getTotalReturns(this.purchasesAndPassedRounds);
  }

  public get purchases(): Array<Investment> {
    return this.investmentRoot.purchases;
  }

  /*
   * Passed rounds are a special subclass of Investment
   */
  public get purchasesAndPassedRounds(): Array<Investment> {
    return this.investmentRoot.purchasesAndPassedRounds;
  }

  /*
   * Calculate returns iteratively with each round's accumulated purchases
   */
  public get accumulatedReturns(): number {
    let total = 0;
    const purchases = this.purchasesAndPassedRounds;
    if (purchases.length > 0) {
      for (let i = 0; i < purchases.length; i++) {
        total += this.getTotalReturns(purchases.slice(0, i));
      }
    }
    return total;
  }

  public get canPurchaseSomething(): boolean {
    return this.investmentRoot.investments.filter(i => !i.purchased && this.canPurchase(i)).length > 0;
  }

  /*
   * Get the owner's feedback as sentiment number and advice message.
   * A sentiment of -1 means worried; 0, neutral; 1, happy; and 2, extatic.
   */
  public get feedback(): {sentiment: number, advice: string, imageUrl: string} {
    let sentiment: number = 0;
    let advice: string = null;
    // TODO Implement real functionality
    if (this.round === ROUND_BASE) {
      sentiment = 1;
      advice = "Hi! I’m happy to be working with such an expert! Here you see all the investment categories available. Let’s start by seeing what options they contain.";
    } else if (!this.canPurchaseSomething) {
      sentiment = -1;
      advice = "Seems like you’ve spent all my money! Now we have to wait to save up funds for investing.";
    } else if (this.roundsLeft === 12) {
      sentiment = 1;
      advice = "One more year to go!";
    } else if (this.roundsLeft === 6) {
      sentiment = -1;
      advice = "Only six months to go on the project!";
    } else if (this.roundsLeft < 7) {
      sentiment = -1;
    }
    // TODO Remove this
    if (!advice) {
      sentiment = (this.round % 4) - 1;
      if (this.round % 3 === 0)
        advice = "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem ipsum dolorem!";
    }
	  return {
      sentiment: sentiment,
      advice: advice === null ? null : this.t(advice),
      imageUrl: AVATAR_IMAGES[sentiment] ?? null
    }
  }

  public t(text: string | LocalizedString): string {
    return this.shared.getText(text);
  }

  /*
   * Check if a subcategory has any of its investments open
   */
  public hasActiveInvestments(investment: InvestmentCategory): boolean {
    return investment.investments.filter(i => i.active).length > 0;
  }

  /*
   * Get the flow intensity as a percentage 0--100 (for this.options.pipeFlowScale = 100) for a dataPipe
   */
  public getPipeFlow(index: number): number {
    if (index > this.investmentRoot.children.length - 1)
      throw new Error(`Index ${index} for getPipeFlow out of range.`);
    // TODO Implement proper behaviour
    let baseValue: number = index === 0 ? this.options.pipeFlowScale : this.getPipeFlow(index - 1);
    let inv = (this.investmentRoot.children[index] as InvestmentCategory).investments;
    return baseValue * inv.filter(i => i.purchased).length / (inv.length ?? 1);
  }

  /*
   * Get the reverse flow intensity as a percentage 0--100 (for this.options.pipeFlowScale = 100) 
   * of the total flow for a dataPipe i.e. the proportion of data that is not utilized by the next block
   */
  public getReversePipeFlow(index: number): number {
    return this.getPipeFlow(index) == 0 ? 0 : 
           (1 - this.getPipeFlow(index + 1) / this.getPipeFlow(index)) * this.options.pipeFlowScale;
  }

  /*
   * Hide a subcategory or an investment and all it's descendants
   * If not argument given, all are hidden
   */
  public hide(node: InvestmentNode = this.investmentRoot): void {
    node.active = false;
  }

  /*
   * Call this with all clicks except investment categories
   */
  public hideInvestments(): void {
    this.hide();
    // this.investmentRoot.children.filter(c =>  (c as InvestmentCategory).onboardingActive)
    //                             .forEach(c => (c as InvestmentCategory).completeOnboarding());
  }

  public canPurchase(investment: Investment): boolean {
    return investment.price <= this.balance;
  }

  public getInvestment(id: InvestmentId): Investment {
    let res = this.investmentRoot.investments.filter(i => i.id == id);
    if (res.length < 1)
      throw new Error(`Could not find Investment with id '${id}'.`);
    return res[0];
  }

  public getTotalReturns(purchases: Array<Investment>): number {
    return this.getInvestmentReturns(purchases) + this.getComboReturns(purchases);
  }

  public getInvestmentReturns(purchases: Array<Investment>): number {
    return sum(purchases.map(p => p.returns || 0));
  }

  public getComboReturns(purchases: Array<Investment>): number {
    return sum(this.investmentCombos.map(c => c.apply(purchases)));
  }

  

}

/*
public get activeSubCategory(): Investment | null {
  const res = this.findInvestments(i => i.active, 2);
  if (!res.length)
    return null;
  return res[0];
}

public get activeInvestment(): Investment | null {
  const subCat = this.activeSubCategory;
  if (!subCat?.children?.length)
    return null;
  for (let i = 0; i < subCat.children.length; i++) {
    if (subCat.children[i].active)
      return subCat.children[i];
  }
  return null;
}
*/

/*
public includesPath(list: Array<InvestmentId>, investment: InvestmentId): boolean {
  for (let i = 0; i < list.length; i++) {
    if (this.eqPath(list[i], investment)) {
      return true;
    }
  }
  return false;
}

public eqPath(a: InvestmentId, b: InvestmentId): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

public deletePath(list: Array<InvestmentId>, investment: InvestmentId): boolean {
  for (let i = 0; i < list.length; i++) {
    if (this.eqPath(list[i], investment)) {
      return delete list[i];
    }
  }
}
*/