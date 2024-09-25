import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable, delay, finalize } from 'rxjs';
import { LoaderService } from '../services/loader.service';

@Injectable()

export class LoaderInterceptor implements HttpInterceptor {
  
  private count = 0;

  constructor(private loaderService: LoaderService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    var index = req.url.indexOf('SisGeo-API/')
    var url = req.url.substring(index + 11);
    
    if (this.count === 0) {
      this.loaderService.setHttpProgressStatus(true, url);
    }
    this.count++;
    return next.handle(req).pipe(
      delay(250),
      finalize(() => {
        this.count--;
        if (this.count === 0) {
          this.loaderService.setHttpProgressStatus(false, url);
        }
      }));
    // return next.handle(request);
  }
}
