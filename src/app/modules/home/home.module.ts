import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {HomeComponent} from './page/home.component';
import {RouterModule, Routes} from '@angular/router';
import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {FlexLayoutModule} from '@angular/flex-layout';
import {MatGridListModule} from '@angular/material/grid-list';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatDialogModule} from '@angular/material/dialog';
import {HomePanelComponent} from './home-panel/home-panel.component';
import {LoginRequiredDialogComponent} from './login-required-dialog/login-required-dialog.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    pathMatch: 'full'
  },
];

@NgModule({
  declarations: [HomeComponent, HomePanelComponent, LoginRequiredDialogComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    MatCardModule,
    MatButtonModule,
    FlexLayoutModule,
    MatGridListModule,
    MatProgressSpinnerModule,
    MatToolbarModule,
    MatDialogModule
  ]
})
export class HomeModule { }
