import { Component, 
         OnDestroy,
         OnInit } from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute,
         NavigationEnd,
         Router } from '@angular/router';
import { trigger,
         style,
         animate,
         transition } from '@angular/animations';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import { ANIMATION_DURATION_MS,
         ANIMATION_TIMING,
         ANIMATION_TIMING_DELAYED,
         Investment,
         InvestmentCategory,
         InvestmentCombo,
         InvestmentId,
         InvestmentNode,
         InvestmentRoot,
         LocalizedString,
         NullInvestment,
         NULL_INVESTMENT_ID,
         SharedService } from '../../shared';

import { ResultChartData } from './result-chart.component';


/* 
 * Because of the different way Angular CLI handles urls in .ts and .css files
 * we need to keep these images in the global assets folder, whilst the images
 * referenced in the sass file are kept in a local one, duh!
 */ 
const AVATAR_IMAGES = {
  '-1': 'assets/images/avatar-worried.png',
   '0': 'assets/images/avatar-neutral.png',
   '1': 'assets/images/avatar-happy.png',
   '2': 'assets/images/avatar-extatic.png',
};
const DATA_KEY_VERSION = 'v';
const DATA_KEY_ONBOARDED = 'o';
const DATA_KEY_PURCHASES = 'p';
const DATA_KEY_SHOWREPORT = 'r';
const DATA_SEPARATOR = ',';
const ROUND_BASE = 1;
const ROUNDS_LEFT_BG = '#ffffff4d'; // To prevent sanitization, ie. 'rgba(255,255,255,0.3)',
const PIPE_FLOW_SCALE = 100; // The pipe flow value's multiplier (from [0,1])

enum ShowableTopic {
  Investment,
  Advice,
  ResetConfirmation,
  Onboarding
}

/*
 * For convenience
 */
function sum(arr: Array<number>): number {
  return arr.reduce((a, b) => a + b, 0);
}
function clamp(num: number, min: number = null, max: number = null): number {
  return num <= min ? min : num >= max ? max : num;
}

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.sass'],
  host: {
    "(click)": "hideOthers()"
  },
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({
          opacity: 0,
        }),
        animate(ANIMATION_TIMING, style({
          opacity: 1,
        })),
      ]),
      transition(':leave', [
        style({
          opacity: 1,
        }),
        // We add a delay to allow for the :enter animation to finish first
        // when switching subcategories
        animate(ANIMATION_TIMING_DELAYED, style({
          opacity: 0,
        })),
      ]),
    ]),
    trigger('switchGrowInOut', [
      transition(':enter', [
        style({
          height: 0,
          overflow: 'hidden',
        }),
        // We add a delay to allow for the :leave animation to finish first
        animate(ANIMATION_TIMING_DELAYED, style({
          height: '*',
          overflow: 'unset',
        })),
      ]),
      transition(':leave', [
        style({
          height: '*',
          overflow: 'hidden',
        }),
        animate(ANIMATION_TIMING, style({
          height: 0,
          overflow: 'hidden',
        })),
      ]),
    ]),
  ],
})
export class GameComponent implements OnDestroy, OnInit {
  // Options (TODO allow setting dynamically)
  public options = {
    hideOnPurchase: true,
    autoShowOnlyChild: true,
    purchaseDelay: ANIMATION_DURATION_MS, // Delay between pushing the purchase button and the action taking place
  };
  public adviceHidden: boolean = false;
  public investmentCombos: Array<InvestmentCombo>;
  public investmentRoot: InvestmentRoot;
  public showReport: boolean = false;
  public showStartOverConfirmation: boolean;
  private _preloaded = new Array<any>();
  private _subscriptions = new Array<Subscription>();

  constructor(
    private route:     ActivatedRoute,
    private router:    Router,
    private shared:    SharedService
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
      this.hideOthers(ShowableTopic.Onboarding);
      this.startOnboarding(category, event);
    }
    // Disable background click if this investment is active,
    // otherwise bg click is okay
    if (event && category.active)
      event.stopPropagation();
  }

  public startOnboarding(category: InvestmentCategory, event: Event = null): void {
    if (category.onboardingAvailable) {
      this.hideOthers(ShowableTopic.Onboarding);
      category.activateOnboarding();
    }
    // To disable background click
    if (event)
      event.stopPropagation();
  }

  public closeOnboarding(category: InvestmentCategory, event?: Event): void {
    this.hideOthers();
    category.completeOnboarding();
    // This is disabled as it makes boxes close and dialogs disappear in unwanted ways.
    // The drawback is that the onboarding status is only saved after a round is completed.
    // this.updateUrl();
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
      return this.show(node.children[0], event);
    } else {
      // Set this one as active
      node.active = true;
    }
    this.hideOthers(ShowableTopic.Investment);
    // To disable background click
    if (event)
      event.stopPropagation();
  }

  /*
   * Delayed purchase action so that we have time for the click animation to show
   * See .investment button:active in the sass file
   */
  public purchaseClick(investment?: Investment, event?: Event): void {
    setTimeout(() => this.purchase(investment, event), this.options.purchaseDelay);
  }

  /*
   * Purchase an investment or pass a round if no investment is specfied.
   */
  public purchase(investment?: Investment, event?: Event): void {
    if (this.options.hideOnPurchase)
      this.hideOthers();
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

  /*
   * Delayed pass action so that we have time for the click animation to show
   */
  public passClick(event?: Event): void {
    this.purchaseClick(null, event);
  }

  public pass(event?: Event): void {
    this.purchase(null, event);
  }

  public resetClick(event?: Event): void {
    this.hideOthers(ShowableTopic.ResetConfirmation);
    this.showStartOverConfirmation = true;
    // To disable background click
    if (event)
      event.stopPropagation();
  }

  public cancelReset(event?: Event): void {
    this.showStartOverConfirmation = false;
    // To disable background click
    if (event)
      event.stopPropagation();
  }

  public startOverClick(event?: Event): void {
    this.hideOthers(ShowableTopic.ResetConfirmation);
    setTimeout(() => this.startOver(event), this.options.purchaseDelay);
  }

  public startOver(event?: Event): void {
    // We are just navigating to the title screen
    this.router.navigate(['/']);
    // this.hideOthers();
    // this.resetState();
    // this.updateUrl();
    // this.startRound();
    // To disable background click
    if (event)
      event.stopPropagation();
  }

  public toggleAdvice(event?: Event): void {
    this.setAdviceHidden(null, event);
  }

  public setAdviceHidden(hide: boolean = true, event?: Event): void {
    this.hideOthers(ShowableTopic.Advice);
    // hide = null means toggle
    this.adviceHidden = hide === null ? !this.adviceHidden : hide;
    // To disable background click
    if (event)
      event.stopPropagation();
  }

  /*
   * Hide a subcategory or an investment and all it's descendants
   * If not argument given, all are hidden
   */
  public hide(node: InvestmentNode = this.investmentRoot): void {
    node.active = false;
  }

  /*
   * Call this with all clicks so we only show one thing at a time
   */
  public hideOthers(show: ShowableTopic = null): void {
    if (show !== ShowableTopic.Investment)
      this.hide();
    if (show !== ShowableTopic.Advice)
      this.adviceHidden = true;
    if (show !== ShowableTopic.ResetConfirmation)
      this.showStartOverConfirmation = false;
    // if (show !== ShowableTopic.Onboarding)
    // nothing special with this one
    // this.investmentRoot.children.filter(c =>  (c as InvestmentCategory).onboardingActive)
    //                             .forEach(c => (c as InvestmentCategory).completeOnboarding());
  }

  /*
   * Handle click on the modal overlay
   * We only have one function for this and it is to show the report
   */
  public modalClick(event?: Event): void {
    this.showReport = true;
    this.updateUrl();
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
      [DATA_KEY_VERSION]:    this.shared.settings.version,
      [DATA_KEY_ONBOARDED]:  this._encodeIds(this.investmentRoot.categories.filter(c => c.isOnboarded).map(c => c.id)),
      [DATA_KEY_PURCHASES]:  this._encodeIds(this.purchasesAndPassedRounds.map(p => p.id)),
      [DATA_KEY_SHOWREPORT]: this.showReport ? 1 : 0,
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
      if (this.route.snapshot.params[DATA_KEY_SHOWREPORT] && 
          this.route.snapshot.params[DATA_KEY_SHOWREPORT] == 1) {
        this.showReport = true;
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
    this.showStartOverConfirmation = false;
  }

  public resetState(resetOnboarding: boolean = false): void {
    this.investmentRoot.reset(resetOnboarding);
    this.showReport = false;
  }

  /**************************************
   * GETTERS                            *
   **************************************/

  public get investmentCategories(): Array<InvestmentCategory> {
    return this.investmentRoot.children as Array<InvestmentCategory>;
  }

  public get balance(): number {
    // After the final round, we add the monthly returns once to match the result chart's view
    return this.getBalance(this.purchasesAndPassedRounds) + (this.roundsLeft === 0 ? this.returns : 0);
  }

  public get spentBalance(): number {
    return this.getSpentBalance(this.purchasesAndPassedRounds);
  }

  /*
   * Note that round is ROUND_BASE-based (= 1)
   */
  public get round(): number {
    return this.rawRound + ROUND_BASE;
  }

  /*
   * The absolute round without ROUND_BASE
   */
  public get rawRound(): number {
    return this.purchasesAndPassedRounds.length;
  }

  public get isFirstRound(): boolean {
    return this.rawRound === 0;
  }
  
  public get roundsLeft(): number {
    return this.shared.settings.rounds - this.rawRound;
  }

  public get roundsUsedPercentage(): string {
    return this.rawRound / this.shared.settings.rounds * 100 + '%';
  }

  public get roundsLeftStyle(): string {
    // This does not work due to a bug so we have to convert rgbas to #-values, see options
    // return this.sanitizer.bypassSecurityTrustStyle(`background: linear-gradient(90deg, transparent, ${this.roundsUsedPercentage}, transparent, ${this.roundsUsedPercentage}, ${this.options.roundsLeftBg});`);
    return `background: linear-gradient(90deg, transparent, ${this.roundsUsedPercentage}, transparent, ${this.roundsUsedPercentage}, ${ROUNDS_LEFT_BG});`;
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

  public get canPurchaseSomething(): boolean {
    return this.investmentRoot.investments.filter(i => !i.purchased && this.canPurchase(i)).length > 0;
  }

  /*
   * Get the owner's feedback as sentiment number, sentiment image url, advice message
   * and a possible warning.
   * A sentiment of -1 means worried; 0, neutral; 1, happy; and 2, extatic.
   */
  public get feedback(): {sentiment: number, advice: string, warning: string | null, imageUrl: string} {
    let sentiment: number = 0;
    let advice: string = "";
    let warning: string = "";

    // 1. Overriding cases
    if (this.round === ROUND_BASE) {
      // First round
      sentiment = 1;
      advice += this.t("Hi! I’m happy to be working with such an expert! Here you see all the investment categories available. Let’s start by seeing what options they contain.");
    } else if (this.roundsLeft === 0) {
      // Last round
      // TODO Add final sentiment
      advice += this.t("This is it! Let’s see how our investments worked out.");
      warning += this.t("Click anywhere to see report.");
    } else {

      // 2. Messages that are always prepended if applicable
      if (this.roundsLeft === 12) {
        advice += this.t("One more year to go!") + " ";
      } else if (this.roundsLeft === 6) {
        sentiment -= 1;
        advice += this.t("Only six months to go on the project!") + " ";
      } 

      // 3. Combos
      const newCmb =  this.getNewlyCompletedCombos().sort((a, b) => b.returns - a.returns);
      const nearCmb = this.getNearlyCompletedCombos();
      if (newCmb.length > 0) {
        sentiment += newCmb.length * this.shared.settings.sentimentOptions.comboCompletionBonus;
        // Use the first available combo description
        let description: any;
        for (let i = 0; i < newCmb.length; i++) {
          if (newCmb[i].description) {
            description = newCmb[i].description;
            break;
          }
        }
        advice += this.t(description ?? "Wow! That investment really seems to pay off!") + " ";
      } else if (nearCmb.length > 0) {
        advice += this.t("It seems we are not utilising these investments as well as we could: ") +
                  nearCmb[0].investments.map(id => this.getInvestment(id))
                                        .filter(i => i.purchased)
                                        .map(i => this.t(i.title))
                                        .join(", ") + ". ";
      }

      // 4. Returns
      const returnsChange = this.returns - this.getTotalReturns(this.purchasesAndPassedRounds.slice(0, -1));
      if (returnsChange < this.shared.settings.sentimentOptions.neutralReturnsRange[0]) {
        sentiment -= 1;
      } else if (returnsChange > this.shared.settings.sentimentOptions.neutralReturnsRange[1]) {
        sentiment += 1;
      }

      // 5. Warnings
      if (!this.canPurchaseSomething) {
        sentiment -= 1;
        warning += this.t("Seems like you’ve spent all my money! Now we have to wait to save up funds for investing.");
      }
    }

    // Clamp sentiment
    sentiment = Math.round(clamp(sentiment, -1, 2));

	  return {
      sentiment: sentiment,
      advice:    advice == "" ? null : advice,
      warning:   warning == "" ? null : warning,
      imageUrl:  AVATAR_IMAGES[sentiment] ?? null
    }
  }

  /*
   * Whether to show the modal overlay
   */
  public get showModal(): boolean {
    return this.roundsLeft <= 0 && !this.showReport;
  }

  /**************************************
   * TEXT LOCALISATION                  *
   **************************************/

  /*
   * Localize a string or LocalizedString object
   * See SharedService
   */
  public t(text: string | LocalizedString): string {
    return this.shared.getText(text);
  }

  /**************************************
   * INVESTMENTS, COMBOS AND CATEGORIES *
   **************************************/

  /*
   * Get total balance based on made purchases
   */
  public getBalance(purchases: Array<Investment>): number {
    return this.shared.settings.balance - this.getSpentBalance(purchases) + this.getAccumulatedReturns(purchases);
  }

  /*
   * Get balance used on investments based on made purchases
   */
  public getSpentBalance(purchases: Array<Investment>): number {
    // We include passed rounds here, as we might defined a cost for passing a round
    return sum(purchases.map(p => p.price));
  }

  /*
   * Check if a subcategory has any of its investments open
   */
  public hasActiveInvestments(investment: InvestmentCategory): boolean {
    return investment.investments.filter(i => i.active).length > 0;
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

  /*
   * Get total accumulated returns based on purchases
   * Calculated by iteratively summing each rounds returns
   */
  public getAccumulatedReturns(purchases: Array<Investment>): number {
    // NB. This code is duplicated in resultChartData() for efficiency
    let total = 0;
    if (purchases.length > 0) {
      for (let i = 0; i < purchases.length; i++) {
        total += this.getTotalReturns(purchases.slice(0, i));
      }
    }
    return total;
  }

  /*
   * Calculate returns generated by the purchases
   */
  public getTotalReturns(purchases: Array<Investment>): number {
    return this.getInvestmentReturns(purchases) + this.getComboReturns(purchases);
  }

  public getInvestmentReturns(purchases: Array<Investment>): number {
    return sum(purchases.map(p => p.returns || 0));
  }

  public getComboReturns(purchases: Array<Investment>): number {
    return sum(this.investmentCombos.map(c => c.apply(purchases)));
  }

  public getCompletedCombos(purchases: Array<Investment>): Array<InvestmentCombo> {
    return this.investmentCombos.filter(c => c.countMissing(purchases) === 0);
  }
  
  /*
   * Get combos completed by the last purchase
   */
  public getNewlyCompletedCombos(): Array<InvestmentCombo> {
    if (this.purchasesAndPassedRounds.length < 1)
      return [];
    const combosBefore = this.getCompletedCombos(this.purchasesAndPassedRounds.slice(0, -1));
    return this.getCompletedCombos(this.purchasesAndPassedRounds)
               .filter(c => !combosBefore.includes(c));
  }

  /*
   * Get combos that can be completed by purchasing one more investment in descending order of returns
   */
  public getNearlyCompletedCombos(): Array<InvestmentCombo> {
    return this.investmentCombos.filter(c => c.countMissing(this.purchases) === 1)
                                .sort((a, b) => b.returns - a.returns);
  }

  /**************************************
   * PIPE FLOW                          *
   **************************************/

  /*
   * Get the flow intensity as a percentage 0--100 (for this.options.pipeFlowScale = 100) for a dataPipe
   */
  public getPipeFlow(index: number): number {
    if (index > this.investmentRoot.children.length - 1)
      throw new Error(`Index ${index} for getPipeFlow out of range.`);
    // TODO Implement proper behaviour
    let baseValue: number = index === 0 ? PIPE_FLOW_SCALE : this.getPipeFlow(index - 1);
    let inv = (this.investmentRoot.children[index] as InvestmentCategory).investments;
    return baseValue * inv.filter(i => i.purchased).length / (inv.length ?? 1);
  }

  /*
   * Get the reverse flow intensity as a percentage 0--100 (for this.options.pipeFlowScale = 100) 
   * of the total flow for a dataPipe i.e. the proportion of data that is not utilized by the next block
   */
  public getReversePipeFlow(index: number): number {
    return this.getPipeFlow(index) == 0 ? 0 : 
           (1 - this.getPipeFlow(index + 1) / this.getPipeFlow(index)) * PIPE_FLOW_SCALE;
  }

  /**************************************
   * REPORT                             *
   **************************************/

  /*
   * Get data for the resultChart component to use
   */
  public get resultChartData(): ResultChartData {
    const data = new Array<any>();
    const purchases = this.purchasesAndPassedRounds;

    // NB. This code is partly copied from getAccumulatedReturns
    let balance = this.shared.settings.balance;
    for (let i = 0; i <= purchases.length; i++) {
      const returns = this.getTotalReturns(purchases.slice(0, i));
      balance += returns;
      balance -= i === 0 ? 0 : purchases[i - 1].price;
      data.push({
        round:      i + ROUND_BASE,
        balance:    balance,
        returns:    returns,
        investment: this.t(i === 0 ? 'Start' : (purchases[i - 1] instanceof NullInvestment ? 'Pass' : purchases[i - 1].title))
      });
    }
    return data;
  }

}