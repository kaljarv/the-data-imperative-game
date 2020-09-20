import { Component, 
         OnDestroy,
         OnInit } from '@angular/core';
import { ActivatedRoute,
         NavigationEnd,
         Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';


import { Investment,
         InvestmentCombo,
         InvestmentId,
         LocalizedString,
         ONBOARDING_NEEDED,
         ONBOARDING_ACTIVE,
         ONBOARDING_COMPLETE,
         ONBOARDING_REACTIVATED,
         SharedService} from '../../services';

const DATA_KEY_VERSION = 'v';
const DATA_KEY_ONBOARDED = 'o';
const DATA_KEY_PURCHASES = 'p';
const DATA_SEPARATOR = ',';

/*
 * For convenience
 */
function sum(arr: Array<number>): number {
  return arr.reduce((a, b) => a + b, 0);
}
/* 
 * Recursively apply a function to the nodes in an Investment node tree
 * If maxDepth is not null, recursion will not progress further than that with 0 limiting application to
 * investment itself.
 */
function recursiveForEach(investment: Investment, func: (Investment) => void, maxDepth: number = null): void {
  const _forEach = (current: Investment, depth: number): void => {
    func(current);
    if ((maxDepth == null || depth < maxDepth) && current.children?.length > 0)
      current.children.forEach(c => _forEach(c, depth + 1));
  }
  _forEach(investment, 0);
}

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.sass'],
  host: {
    "(click)": "hideOthers()"
  }
})
export class GameComponent implements OnDestroy, OnInit {
  // Options (TODO allow setting dynamically)
  public options = {
    hideOnPurchase: true
  };
  public investmentCombos: Array<InvestmentCombo>;
  public investmentRoot: Investment;
  public purchases: Array<InvestmentId>;
  private _subscriptions = new Array<Subscription>();

  constructor(
    private route:  ActivatedRoute,
    private router: Router,
    private shared: SharedService
  ) {
    this.investmentRoot = this.shared.settings.investments;
    this._preprocessInvestments(this.investmentRoot);
    this.investmentCombos = this.shared.settings.investmentCombos;
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
  }

  ngOnDestroy(): void {
    this._subscriptions.forEach(s => s.unsubscribe());
  }

  /**************************************
   * USER ACTIONS                       *
   **************************************/

  public categoryClick(investment: Investment, event: Event = null): void {
    if (this.needsOnboarding(investment)) {
      this.startOnboarding(investment);
    }
    // Disable background click if this investment is active,
    // otherwise bg click is okay
    if (event && investment.active)
      event.stopPropagation();
  }

  public startOnboarding(investment: Investment, event: Event = null): void {
    if (this.onboardingAvailable(investment)) {
      this.hideOthers();
      investment.onboardingStatus = ONBOARDING_ACTIVE;
    }
    // To disable background click
    if (event)
      event.stopPropagation();
  }

  public closeOnboarding(investment: Investment, event?: Event): void {
    this.hideOthers();
    investment.onboardingStatus = ONBOARDING_COMPLETE;
    this.updateUrl();
    // To disable background click
    if (event)
      event.stopPropagation();
  }

  /*
   * Open a subcategory or an investment
   */
  public show(investment: Investment, event?: Event): void {
    if (investment.parent) {
      // Propagate showing upwards first so we also hide siblings of ancestors
      this.show(investment.parent);
      // Deactivate siblings and their descendants
      investment.parent.children.filter(i => i != investment).forEach(i => this.hide(i));
    }
    // Set this one as active
    investment.active = true;
    // To disable background click
    if (event)
      event.stopPropagation();
  }

  public purchase(investment: Investment, event?: Event): void {
    if (this.options.hideOnPurchase)
      this.hideOthers();
    this.purchases.push(investment.id);
    this.updateUrl();
    // To disable background click
    if (event)
      event.stopPropagation();
  }

  public catchClick(event: Event): void {
    event.stopPropagation();
  }




  /**************************************
   * OTHER METHODS                      *
   **************************************/

  public updateUrl(): void {
    // We use router to save the game data between sessions
    this.router.navigate([{
      [DATA_KEY_VERSION]:   this.shared.settings.version,
      [DATA_KEY_ONBOARDED]: this._encodeIds(this.findInvestments(i => this.isOnboarded(i)).map(i => i.id)),
      [DATA_KEY_PURCHASES]: this._encodeIds(this.purchases)
    }]);
  }

  public readParams(): void {
    // Only load purchases from route data if the application versions match
    // Otherwise reset the state to handle the going back to an url without params
    if (this.route.snapshot.params?.[DATA_KEY_VERSION] && 
      this.route.snapshot.params[DATA_KEY_VERSION] == this.shared.settings.version) {
      if (this.route.snapshot.params[DATA_KEY_PURCHASES])
        this.purchases = this._decodeIds(this.route.snapshot.params[DATA_KEY_PURCHASES]);
      if (this.route.snapshot.params[DATA_KEY_ONBOARDED]) {
        let ids = this._decodeIds(this.route.snapshot.params[DATA_KEY_ONBOARDED]);
        this.findInvestments(i => ids.includes(i.id)).forEach(i => i.onboardingStatus = ONBOARDING_COMPLETE);
      }
    } else {
      this.resetState();
    }
  }

  private _encodeIds(list: Array<InvestmentId>): string {
    return list.join(DATA_SEPARATOR);
  }
  private _decodeIds(text: string): Array<InvestmentId> {
    return text.split(DATA_SEPARATOR).map(s => parseInt(s));
  }

  public resetState(): void {
    this.purchases = new Array<InvestmentId>();
    recursiveForEach(this.investmentRoot, i => {
      delete i.active;
      if (i.onboardingStatus === ONBOARDING_ACTIVE || i.onboardingStatus === ONBOARDING_COMPLETE)
        i.onboardingStatus = ONBOARDING_NEEDED;
    });
  }

  /*
   * Add parent property to investments
   */
  private _preprocessInvestments(root: Investment): void {
    const _setParent = (parent: Investment | null, child: Investment): void => {
      if (parent != null)
        child.parent = parent;
      if (child.children?.length > 0)
        child.children.forEach(grandChild => _setParent(child, grandChild));
    }
    _setParent(null, root);
  }

  public get investmentCategories(): Array<Investment> {
    return this.investmentRoot.children;
  }

  public get balance(): number {
    return this.shared.settings.balance - this.spentBalance + this.accumulatedReturns;
  }

  public get spentBalance(): number {
    return sum(this.purchases.map(p => this.getInvestment(p).price));
  }

  public get roundsLeft(): number {
    return this.shared.settings.rounds - this.purchases.length;
  }

  public get returns(): number {
    return this.getTotalReturns(this.purchases);
  }

  /*
   * Calculate returns iteratively with each round's accumulated purchases
   */
  public get accumulatedReturns(): number {
    let total = 0;
    if (this.purchases.length > 0) {
      for (let i = 0; i < this.purchases.length; i++) {
        total += this.getTotalReturns(this.purchases.slice(0, i));
      }
    }
    return total;
  }

  public t(text: string | LocalizedString): string {
    return this.shared.getText(text);
  }

  /*
   * Check if a given category needs onboarding
   */
  public needsOnboarding(investment: Investment): boolean {
    return investment.onboardingStatus === ONBOARDING_NEEDED;
  }

  public isOnboarded(investment: Investment): boolean {
    return investment.onboardingStatus === ONBOARDING_COMPLETE || investment.onboardingStatus === ONBOARDING_REACTIVATED;
  }

  public onboardingActive(investment: Investment): boolean {
    return investment.onboardingStatus === ONBOARDING_ACTIVE || investment.onboardingStatus === ONBOARDING_REACTIVATED;
  }

  public onboardingAvailable(investment: Investment): boolean {
    return investment.onboardingStatus === ONBOARDING_NEEDED || investment.onboardingStatus === ONBOARDING_COMPLETE;
  }

  /*
   * Check if a subcategory has any of its investments open
   */
  public hasActiveInvestments(investment: Investment): boolean {
    for (let i = 0; i < investment.children?.length; i++) {
      if (investment.children[i].active)
        return true;
    }
    return false;
  }

  /*
   * Hide a subcategory or an investment and all it's descendants
   * If not argument given, all are hidden
   */
  public hide(investment: Investment = this.investmentRoot): void {
    recursiveForEach(investment, i => delete i.active);
  }

  /*
   * Call this with all clicks except investment categories
   */
  public hideOthers(): void {
    this.hide();
  }

  public canPurchase(investment: Investment): boolean {
    return investment.price <= this.balance;
  }

  public isPurchased(investment: Investment): boolean {
    return this.purchases.includes(investment.id);
  }

  /*
   * Search the investments tree based on a rule and return the matching investments.
   * If not rule is specified returns all Investments
   * TODO: Allow for just finding the first result
   */
  public findInvestments(rule: (Investment) => boolean = () => true, maxDepth: number = null): Array<Investment> {
    let found = new Array<Investment>();
    recursiveForEach(this.investmentRoot, i => {
      if (rule(i))
        found.push(i);
    }, maxDepth);
    return found;
  }

  public getInvestment(id: InvestmentId): Investment {
    let res = this.findInvestments(i => i.id == id);
    if (res.length < 1)
      throw new Error(`Could not find Investment with id '${id}'.`);
    return res[0];
  }

  public getTotalReturns(purchases: Array<InvestmentId>): number {
    return this.getInvestmentReturns(purchases) + this.getComboReturns(purchases);
  }

  public getInvestmentReturns(purchases: Array<InvestmentId>): number {
    return sum(purchases.map(p => this.getInvestment(p).returns || 0));
  }

  public getComboReturns(purchases: Array<InvestmentId>): number {
    return sum(this.investmentCombos.map(c => this.applyCombo(c, purchases)));
  }

  /*
   * Test the combo against purchases and return returns if combo is applicable or 0 if not.
   */
  public applyCombo(combo: InvestmentCombo, purchases: Array<InvestmentId>): number {
    for (let i = 0; i < combo.investments.length; i++) {
      if (!purchases.includes(combo.investments[i]))
        return 0;
    }
    return combo.returns;
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