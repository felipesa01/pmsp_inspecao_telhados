import { Injectable } from '@angular/core';
import { Observable, ReplaySubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {

  private httpLoading$ = new ReplaySubject<{loading: boolean, req: string}>(1);
  
  constructor() { }

  httpProgress(): Observable<{loading: boolean, req: string}> {
    return this.httpLoading$.asObservable();
  }

  setHttpProgressStatus(inprogress: boolean, req: string) {
    this.httpLoading$.next({loading: inprogress, req: req});
  }
}
