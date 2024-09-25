/// <reference types="@angular/localize" />

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import * as Cesium from 'cesium'



platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));

Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyODdmOTA2Yy1jZjU4LTQxMWItYmY3YS1hN2Q5YzNhZGQyYTEiLCJpZCI6MjQyMjUwLCJpYXQiOjE3MjY2MjAyNTh9.rBXujTk_MJ1DKzB5HucdCIYOM7Mh5M6dq7xP22w297I";
window['CESIUM_BASE_URL'] = '/assets/cesium/';
window['Cesium'] = Cesium
