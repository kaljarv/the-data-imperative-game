# The Data Imperative Game


Play the game at https://kaljarv.github.io/the-data-imperative-game/.

## Editing settings and texts

The settings and text strings are collected in two json files found in `/src/assets/data/`.

Texts are fetched from `texts.json` using the string itself (or in some cases an uppercase moniker) as the first key and Angular’s LOCALE_ID as the second. If a translation for the locale is not found en-US is used. If no entry at all for the string is found in `texts.json` the string itself is used.

Once changed, override these files in the `docs/assets/data` folder.

The structure of `settings.json` is as follows. In particular investments  investment categories and investment combos are defined as a node-tree-esque hierarchy. (See `/src/app/shared/shared.types.ts` and `investment.types.ts` for full details of the data formats.)

  /src/assets/data/settings.json

    version: number (increment each time settings are changed)
    balance: number (starting balance)
    rounds: number (game length)
    bookUrl: string (link from title screen)
    sentimentOptions:
      neutralReturnsRange: array of two numbers
        number (lower bound)
        number (upper bound)
      comboCompletionBonus: number (the bonus sentiment awarded for each combo completed this round)

    investments: array of top-level categories
      id: number
      title: LocalizedString
      description: LocalizedString (content of the info view)
      onboardingStatus: OnboardingStatus/number (= 1 for if onboarding is needed)
      children: array of subcategories
        id: number
        title: LocalizedString
        children: array of investments
          id: number
          title: LocalizedString
          longTitle: LocalizedString
          description: LocalizedString
          price: number
          returns: number

    investmentCombos: array of combinations
      investments: array of investment ids (numbers)
      description: LocalizedString
      returns: number

## Deploying on Github pages

See: https://angular.io/guide/deployment#deploy-to-github-pages

1. Build the project using the Angular CLI with:

  ng build --prod --output-path docs --base-href /the-data-imperative-game/

2. When the build is complete, make a copy of `docs/index.html` and name it `docs/404.html`:

  cp docs/index.html docs/404.html

3. Commit your changes and push.

  git add .
  git commit -a -m "Deploy on Github pages"
  git push

4. Make sure Github is configured to [publish from the docs folder](https://docs.github.com/en/free-pro-team@latest/github/working-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site#publishing-your-github-pages-site-from-a-docs-folder-on-your-master-branch).

## File structure

For settings and text strings see § Editing settings and texts above.

The bulk of the gameplay is defined in `/src/app/pages/game/game.component.ts` and the report graph in `result-chart.component.ts` in the same folder. The investment and category objects however implement some actions as methods. For these see `/src/app/shared/invesment.types.ts`.

The shared service at `/src/app/shared/shared.service.ts` contains a method for text localisation and allows access to the settings and strings defined in the asset json-files. The D3 library for the result chart is provided by `/src/app/shared/d3.service.ts`.

**NB** Due to the different way the Angular CLI handles asset urls in sass, ts and html files, our assets are very inelegantly spread into local and global assets folders, as links will break otherwise when not deploying from the domain root, as is the case with Github Pages.

## Things to develop later

* Make final report nicer
* Allow viewing of interim report by clicking the Investments button
* Convert localisation to use i18l

## Authors

Game concept and the book on which it is based: prof. Henri Schildt Aalto University.

UX and graphic design: Kiira Keski-Hakuni [Kipsonite](http://kipsonite.com) & Aalto University.

Engineering: Kalle Järvenpää / @kaljarv [Kalle Järvenpää Design](http://kaljarv.com/) & Aalto University.

Character illustrations based on original designs by [Freepik](http://www.freepik.com).

Background photo by [Roman Bozhko](www.romanbozhkocreative.com).

## Licensing

The software exluding the files listed below is distributed under the MIT license. The license does not include the image files for whose license see § Authors above:

* `/src/assets/images/avatar-extatic.png`
* `/src/assets/images/avatar-happy.png`
* `/src/assets/images/avatar-neutral.png`
* `/src/assets/images/avatar-worried.png`
* `/src/assets/images/game-bg.jpg`

Software copyright 2020 Henri Schildt Kalle Järvenpää and Kiira Keski-Hakuni.

Permission is hereby granted free of charge to any person obtaining a copy of this software and associated documentation files (the Software) to deal in the Software without restriction including without limitation the rights to use copy modify merge publish distribute sublicense and/or sell copies of the Software and to permit persons to whom the Software is furnished to do so subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED AS IS WITHOUT WARRANTY OF ANY KIND EXPRESS OR IMPLIED INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM DAMAGES OR OTHER LIABILITY WHETHER IN AN ACTION OF CONTRACT TORT OR OTHERWISE ARISING FROM OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.