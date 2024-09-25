import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { CookieService } from 'ngx-cookie-service';

export interface UserClaim {
  type: string;
  value: string;
}
export interface Response {
  isSuccess: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  baseUrl: string = '/APIFramework/token'

  constructor(private http: HttpClient, private cookieService: CookieService) {
  }


  login(model: { grant_type: string, username: string, password: string }) {
    const body = new HttpParams().set('grant_type', model.grant_type).set('username', model.username).set('password', model.password)
    return this.http.post(this.baseUrl, body.toString(), {
      headers: new HttpHeaders()
        .set('Content-Type', 'application/x-www-form-urlencoded')
    })
  }

  public signIn(model: { grant_type: string, username: string, password: string }) {
    const body = new HttpParams().set('grant_type', model.grant_type).set('username', model.username).set('password', model.password)
    return this.http.post(this.baseUrl, body.toString(), {
      headers: new HttpHeaders()
        .set('Content-Type', 'application/x-www-form-urlencoded')
    })
  }

  public signOut() {
    return this.http.get('api/auth/signout');
  }

  public user() {
    return this.http.get<UserClaim[]>('api/auth/user');
  }
  
  public isSignedIn(): Observable<boolean> {
    return this.user().pipe(
      map((userClaims) => {
        const hasClaims = userClaims.length > 0;
        return !hasClaims ? false : true;
      }),
      catchError((error) => {
        return of(false);
      }));
  }

  testCookie() {
    this.cookieService.set('token', 'Hello World');
    console.log(this.cookieService.get('token'));
  }

}
