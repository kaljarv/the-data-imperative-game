import { NgModule } from '@angular/core';
import { Routes, 
         RouterModule } from '@angular/router';

import { TitleScreenComponent } from './pages/title-screen/title-screen.component';
import { GameComponent } from './pages/game';

const routes: Routes = [
  { path: '', 
    component: TitleScreenComponent },
  { path: 'start', 
    component: TitleScreenComponent },
  { path: 'game', 
    component: GameComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
