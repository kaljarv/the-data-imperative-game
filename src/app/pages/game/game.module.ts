import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';

import { GameComponent } from './game.component';
import { NumberTrackerComponent } from './number-tracker.component';

@NgModule({
  imports: [
    CommonModule,
    BrowserModule,
  ],
  exports: [
    GameComponent,
  ],
  declarations: [
    GameComponent,
    NumberTrackerComponent
  ],
})
export class GameModule {}