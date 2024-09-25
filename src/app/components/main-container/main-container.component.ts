import { AfterContentChecked, AfterViewInit, ChangeDetectorRef, Component, ComponentRef, ElementRef, ViewChild } from '@angular/core';
import { ResizeEvent } from 'angular-resizable-element';
import { Coordinate, format } from 'ol/coordinate';
import { GeoService } from 'src/app/services/geo.service';
import {toStringHDMS} from 'ol/coordinate';
import { SidebarComponent } from './sidebar/sidebar.component';

@Component({
  selector: 'app-main-container',
  templateUrl: './main-container.component.html',
  styleUrls: ['./main-container.component.css']
})
export class MainContainerComponent implements AfterContentChecked {

  @ViewChild('appSidebar', { read: ElementRef<HTMLElement> }) sideBarElementRef: ElementRef;
  openSideNav: boolean = true;
  minWidthStyle: number = 280;
  maxWidthStyle: number = 500
  widthStyle: number = this.minWidthStyle;

  scaleNumber;

  isCoordsWGSDecimal: boolean;
  scaleMap = 'Carregando...';

  layersIsLoading: boolean = true;
  
  constructor(public geoService: GeoService, private cdRef : ChangeDetectorRef) {
    this.geoService.sidebarOpened.subscribe((e) => this.openSideNav = e)

    this.geoService.layersIsLoading$.subscribe(e => this.layersIsLoading = e);

    this.geoService.resizeSidebar.next(this.widthStyle);
  }

  
  ngAfterViewInit() {
  }

  setScale(e) { 
    this.scaleNumber = e.target.value;
    this.geoService.setMapScale(this.scaleNumber);
  };

  ngAfterContentChecked() {
    this.geoService.mapScale.subscribe(e => {
      if (e) this.scaleMap = 'Escala aprox. 1:' + e.toFixed(1).toString();
      this.scaleNumber = e.toFixed(0); 
    });
    this.cdRef.detectChanges(); 
  };

  onResizing(event: ResizeEvent): void {
    this.widthStyle = event.rectangle.width < this.minWidthStyle ? this.minWidthStyle : event.rectangle.width;
    this.widthStyle = this.widthStyle > this.maxWidthStyle ? this.maxWidthStyle : this.widthStyle;
    this.geoService.resizeSidebar.next(this.widthStyle);
  }

  onResizeEnd(event: ResizeEvent): void {

    // this.geoService.resizeSidebar.next(this.widthStyle);
  }

  // toggleCoordsWGSFormat() {
  //   this.isCoordsWGSDecimal = !this.isCoordsWGSDecimal;
  // }

  toStringHDMSFunction (coords: Coordinate) {
    return toStringHDMS(coords);
  }

  formatCoordsWGS (coords: Coordinate) {
    if (!coords) return 'Mouse fora do mapa'
    const template = '{y}°, {x}°';
    return format(coords, template, 5);
  }

  formatCoordsUTM (coords: Coordinate) {
    if (!coords) return 'Mouse fora do mapa'
    const template = '{x} E, {y} N';
    return format(coords, template, 2);
  }

  getScale(scale) {
    if (scale === 0) return 'Carregando...'
    return 'Escala aprox. 1:' + scale.toFixed(1);
  }



}
