import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UserLoginService {

  baseUrl: string = '/APIFramework/token'

  constructor(private http: HttpClient) {
  }


  login(model: {grant_type: string, username: string, password: string}) {
    console.log(model)

    const body = new HttpParams().set('grant_type', model.grant_type).set('username', model.username).set('password', model.password)

    // const headers = new HttpHeaders;
    // headers.append('Access-Control-Allow-Origin', '*');

    return this.http.post(this.baseUrl, body.toString(), {
      headers: new HttpHeaders()
        .set('Content-Type', 'application/x-www-form-urlencoded')
    })
    
  }
}
