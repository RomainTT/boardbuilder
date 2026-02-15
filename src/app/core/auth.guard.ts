import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree} from '@angular/router';
import {AuthService} from '@app/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) { }

  canActivate(
    _next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): boolean | UrlTree {
    if (this.authService.hasValidToken()) {
      return true;
    }

    // Redirect to home with flag and original URL so after login we can send user back
    return this.router.createUrlTree(['/'], {
      queryParams: { loginRequired: 'true', returnUrl: state.url }
    });
  }

}
