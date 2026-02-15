import {Component, OnDestroy} from '@angular/core';
import {AuthService} from '@app/services/auth.service';
import {Observable, Subscription} from 'rxjs';
import {ActivatedRoute, Router} from '@angular/router';
import {ToolbarService} from '@app/services/toolbar.service';
import {MatDialog} from '@angular/material/dialog';
import {LoginRequiredDialogComponent} from '../login-required-dialog/login-required-dialog.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnDestroy {

  isDoneLoading: Observable<boolean>;
  canActivateProtectedRoutes: Observable<boolean>;

  /** Set from sync token check so correct label shows on first paint; subscription updates when loading completes. */
  signedIn: boolean;

  panelId = 0;

  private subscriptions = new Subscription();

  private loginRequiredModalTimeoutId?: number;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toolbarService: ToolbarService,
    private dialog: MatDialog,
  ) {
    this.isDoneLoading = this.authService.isDoneLoading$;
    this.canActivateProtectedRoutes = this.authService.canActivateProtectedRoutes$;

    this.signedIn = this.authService.hasValidToken();
    this.subscriptions.add(
      this.authService.canActivateProtectedRoutes$.subscribe(canActivate => this.signedIn = canActivate)
    );

    // When redirected from a protected route (loginRequired=true), show login-required modal
    const loginRequired = this.route.snapshot.queryParamMap.get('loginRequired') === 'true';
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (loginRequired) {
      this.loginRequiredModalTimeoutId = window.setTimeout(() => {
        if (!this.authService.hasValidToken()) {
          this.dialog.open(LoginRequiredDialogComponent, {
            width: '400px',
            disableClose: false,
            data: { returnUrl: returnUrl && returnUrl.startsWith('/') ? returnUrl : null },
          });

          this.router.navigate([], {
            queryParams: { loginRequired: null, returnUrl: null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
          });
        }
        this.loginRequiredModalTimeoutId = undefined;
      }, 300);
    }
  }

  ngOnDestroy(): void {
    if (this.loginRequiredModalTimeoutId !== undefined) {
      window.clearTimeout(this.loginRequiredModalTimeoutId);
    }
    this.subscriptions.unsubscribe();
  }

  login() { this.authService.login(); }

  getStarted() {
    if (this.signedIn) {
      this.router.navigate(['/', 'boardsets']);
    } else {
      this.authService.login();
    }
  }
}
