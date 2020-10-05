import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { GameComponent } from './game.component';
import { NumberTrackerComponent } from './number-tracker.component';
import { ResultChartComponent } from './result-chart.component';

@NgModule({
  imports: [
    CommonModule,
    BrowserModule,
    BrowserAnimationsModule,
  ],
  exports: [
    GameComponent,
  ],
  declarations: [
    GameComponent,
    NumberTrackerComponent,
    ResultChartComponent
  ],
})
export class GameModule {}