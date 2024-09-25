
import { Component, ElementRef, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { GeoService } from 'src/app/services/geo.service';
import { LayersManagementService } from 'src/app/services/layers-management.service';
import { ModalGenericHTMLComponent } from '../../../../modal-generic-html/modal-generic-html.component';

@Component({
  selector: 'app-modal-go-to-coords',
  templateUrl: './modal-go-to-coords.component.html',
  styleUrls: ['./modal-go-to-coords.component.css']
})
export class ModalGoToCoordsComponent implements OnDestroy {

  type = new FormControl<number>(0);
  gmsWE = new FormControl<number>(-1);
  gmsNS = new FormControl<number>(-1);
  
  coordsOne = new FormControl<{lat?: number, lon?: number, type?: number}>({});
  coordsThree = new FormControl<{lat: number[], lon: number[]}>({lat: [], lon: []});

  placeholderDMS = ['23° 31′ 13″ S', '46° 57′ 39″ W'];
  placeholderDegrees = ['-23,553422°', '-46,542353°'];
  placeholderUTM = ['306068.67 E', '7397620.49 N'];

  pointsAdded: {id: number, coordX: number, coordY: number, src: number}[] = []
  labelPointsAdded = {id: 'Nº', coordX: 'Coord. X', coordY: 'Coord. Y', src: 'SRC'};
  tableHeader: string[];
  coordX: number;
  coordXMin: number;
  coordXSec: number;
  coordY: number;
  coordYMin: number;
  coordYSec: number;
  epsg: number = 4326;

  constructor(private geoservice: GeoService, private layersMng: LayersManagementService, private _elementRef: ElementRef, public dialogRef: MatDialogRef<ModalGoToCoordsComponent>, private dialog: MatDialog) {
    this.type.valueChanges.subscribe(e => {
      this.resetValues();

      if (e == 1 || e == 2) this.epsg = 4326;
      else this.epsg = 31983;
    });

    this.createAndInsertLayer();
  }

  createAndInsertLayer() {
    this.geoservice.map.addLayer(this.layersMng.goToCoordsLayer);
  }

  clearAndRemoveLayer() {
    this.layersMng.goToCoordsLayer.getSource().clear();
    this.geoservice.map.removeLayer(this.layersMng.goToCoordsLayer);
  }

  resetValues() {
    this.coordX = undefined;
    this.coordXMin = undefined
    this.coordXSec = undefined;
    this.coordY = undefined;
    this.coordYMin = undefined;
    this.coordYSec = undefined;

  }
  
  ngOnDestroy(): void {
    let element: HTMLElement = this._elementRef.nativeElement;
    let dialog = element.parentElement.parentElement.parentElement.parentElement;
    let dialogPosition = dialog.getBoundingClientRect();
    this.geoservice.updatePositionModal(this.geoservice.dialogPositionGoToCoords, {top: dialogPosition.top, left: dialogPosition.left});

    this.clearAndRemoveLayer();
  }

  onkeyDown(e: KeyboardEvent) {
  }

  doApply() {

    if (!this.coordY || !this.coordX) return
    
    var newCoordY = Number(this.coordY);
    var newCoordX = Number(this.coordX);
    if (this.type.value == 2) {
      var minY = this.coordYMin/60;
      var secY = this.coordYSec/3600;
      var minX = this.coordXMin/60;
      var secX = this.coordXSec/3600;
      var newCoordY = this.gmsNS.value * (Math.abs(newCoordY) + Math.abs(minY) +  Math.abs(secY));
      var newCoordX = this.gmsWE.value * (Math.abs(newCoordX) + Math.abs(minX) +  Math.abs(secX));
    }

    var id_ = this.getMaxId();
    var feature = new Feature({geometry: new Point([newCoordX, newCoordY]), id: id_});
    if (this.type.value == 3) {
      feature.getGeometry().transform('EPSG:' + this.epsg, 'EPSG:4326');
    }
    
    this.layersMng.goToCoordsLayer.getSource().addFeature(feature);

    var extent = this.layersMng.goToCoordsLayer.getSource().getExtent();
    if (isFinite(extent[0])) this.geoservice.map.getView().fit(extent, { padding: Array(4).fill(150), duration: 500, maxZoom: 18 });
    this.pointsAdded.push({id: id_, coordX: newCoordX, coordY: newCoordY, src: this.epsg})

    this.tableHeader = Object.keys(this.pointsAdded[0]);
    this.resetValues();
  
  }

  onTableClick(id: number) {
    var features = this.layersMng.goToCoordsLayer.getSource().getFeatures();
    var feature = features.filter(e => e.get('id') === id)[0];
    var extent = feature?.getGeometry()?.getExtent();
    if (isFinite(extent[0])) this.geoservice.map.getView().fit(extent, { padding: Array(4).fill(50), duration: 500, maxZoom: 18 });
  }

  removePoint(id: number) {
    var features = this.layersMng.goToCoordsLayer.getSource().getFeatures();
    var feature = features.filter(e => e.get('id') === id)[0];
    this.layersMng.goToCoordsLayer.getSource().removeFeature(feature);
    this.pointsAdded = this.pointsAdded.filter(e => e.id != id);
  }

  close() {
    this.geoservice.setGoToCoords(false);
    this.geoservice.goToCoordCloser.next(true);
  }

  getMaxId() {
    return this.pointsAdded.length > 0 ? Math.max(...this.pointsAdded.map(e => e.id)) + 1 : 1;
  }

  openInfo() {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = `<div>Teste</div>`
    this.dialog.open(ModalGenericHTMLComponent, dialogConfig);
  }

}
