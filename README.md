# The Data Imperative Game

## To do

* Make final report nicer
* Allow viewing of interim report by clicking the Investments button
* Convert localisation to use i18l

## Editing settings and texts

The settings and text strings are collected in two json files found in `/src/assets/data/`.

Texts are fetched from `texts.json` using the string itself (or in some cases an uppercase moniker) as the first key and Angular’s LOCALE_ID as the second. If a translation for the locale is not found, en-US is used. If no entry at all for the string is found in `texts.json`, the string itself is used.

See `/src/app/shared/shared.types.ts` and `investment.types.ts` for the data formats.

## Editing other files

Make the necessary edits and then deploy the compiled app with `ng deploy`.

## Authors

Game concept and the book on which it is based: prof. Henri Schildt, Aalto University.

UX and graphic design: Kiira Keski-Hakuni, Aalto University.

Engineering: Kalle Järvenpää / @kaljarv, [Kalle Järvenpää Design](http://kaljarv.com/).

## Licensing

The software is distributed under the MIT license.

Copyright 2020 Henri Schildt, Kalle Järvenpää and Kiira Keski-Hakuni

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.