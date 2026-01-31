import {Component, OnDestroy} from '@angular/core';
import {AuthService} from '@app/services/auth.service';
import {Observable, Subscription} from 'rxjs';
import {ActivatedRoute, Router} from '@angular/router';
import {ToolbarService} from '@app/services/toolbar.service';
import {MatSnackBar} from '@angular/material/snack-bar';
import {take} from 'rxjs/operators';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnDestroy {

  isDoneLoading: Observable<boolean>;
  canActivateProtectedRoutes: Observable<boolean>;

  signedIn: boolean;

  panelId = 0;

  private subscriptions = new Subscription();

  private notifySnackTimeoutId?: number;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toolbarService: ToolbarService,
    private snackBar: MatSnackBar,
  ) {
    this.isDoneLoading = this.authService.isDoneLoading$;
    this.canActivateProtectedRoutes = this.authService.canActivateProtectedRoutes$;

    this.subscriptions.add(
      this.authService.canActivateProtectedRoutes$.subscribe(canActivate => this.signedIn = canActivate)
    );

    // Show a one-time notification ONLY when explicitly requested via `notify=true`.
    // Use the route snapshot so the timing doesn't depend on late observable emissions/rendering.
    const shouldNotify = this.route.snapshot.queryParamMap.get('notify') === 'true';
    if (shouldNotify) {
      this.notifySnackTimeoutId = window.setTimeout(() => {
        this.authService.isAuthenticated$.pipe(take(1)).subscribe(isAuthenticated => {
          if (isAuthenticated) {
            return;
          }

          this.snackBar.open('Please sign in to continue', 'Dismiss', {
            duration: 6000,
          });

          // Clear the query parameter to avoid showing the message again.
          this.router.navigate([], {
            queryParams: { notify: null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
          });
        });
      }, 500);
    }
  }

  ngOnDestroy(): void {
    if (this.notifySnackTimeoutId !== undefined) {
      window.clearTimeout(this.notifySnackTimeoutId);
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
