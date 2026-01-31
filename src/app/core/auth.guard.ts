import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree} from '@angular/router';
import {Observable} from 'rxjs';
import {AuthService} from '@app/services/auth.service';
import {map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) { }

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.authService.canActivateProtectedRoutes$
      .pipe(map(canActivate => {
        // If the Guard denies the action, redirect to the landing page.
        // Preserve `notify=true` from the attempted URL so we can show a one-time snackbar.
        if (canActivate) {
          return true;
        }

        const parsedAttemptedUrl = this.router.parseUrl(state.url);
        const shouldNotify = parsedAttemptedUrl?.queryParams?.notify === 'true';

        if (shouldNotify) {
          return this.router.createUrlTree(['/'], { queryParams: { notify: 'true' } });
        }

        return this.router.createUrlTree(['/']);
      }));
  }

}
