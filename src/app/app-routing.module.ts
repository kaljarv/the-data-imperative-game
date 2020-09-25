import { NgModule } from '@angular/core';
import { Routes, 
         RouterModule } from '@angular/router';

import { TitleScreenComponent } from './pages/title-screen/title-screen.component';
import { GameComponent } from './pages/game';
import { ReportComponent } from './pages/report/report.component';

const routes: Routes = [
  { path: '', 
    component: TitleScreenComponent },
  { path: 'start', 
    component: TitleScreenComponent },
  { path: 'game', 
    component: GameComponent },
  { path: 'report', 
    component: ReportComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
