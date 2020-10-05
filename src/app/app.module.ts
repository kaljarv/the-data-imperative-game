import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TitleScreenComponent } from './pages/title-screen/title-screen.component';
import { GameModule } from './pages/game';
import { SharedService, 
         D3Service } from './shared';

@NgModule({
  declarations: [
    AppComponent,
    TitleScreenComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    GameModule
  ],
  providers: [
    SharedService, 
    D3Service
  ],
  bootstrap: [ AppComponent ]
})
export class AppModule { }
