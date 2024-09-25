import { Component, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import TileLayer from 'ol/layer/Tile';
import { TileWMS } from 'ol/source';
import { Subscription, concat, lastValueFrom, take } from 'rxjs';
import { ApisConectionService } from 'src/app/services/apis-conection.service';
import { GeoService } from 'src/app/services/geo.service';
import { LayersManagementService, layerCatalogItem, mappingResultObject } from 'src/app/services/layers-management.service';
import { listItem } from '../main-container/sidebar/main-layer-list/main-layer-list.component';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';

@Component({
  selector: 'app-drone-tiles-list',
  templateUrl: './drone-tiles-list.component.html',
  styleUrls: ['./drone-tiles-list.component.css']
})
export class DroneTilesListComponent implements OnInit, OnDestroy {

  layerId = '68';
  isLoading: boolean = true;
  data: {}[]
  tableHeader: string[];
  colNames: object;

  dataSub: Subscription

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  displayedColumns;
  dataSource: MatTableDataSource<any>;

  constructor(private geoservice: GeoService, private layersMng: LayersManagementService, public dialogRef: MatDialogRef<DroneTilesListComponent>, private apiConection: ApisConectionService, private toastr: ToastrService, @Inject(MAT_DIALOG_DATA) public asLayer: boolean) {

  }

  ngAfterViewInit() {

  }

  ngOnDestroy() {
    this.dataSub.unsubscribe();
  }

  ngOnInit(): void {
    this.getDroneTiles();
  }

  async getDroneTiles() {
    this.dataSub = this.apiConection.getAttributesFromPg({ layerId: '68' }, ['tipo','local','data','operador','secretaria','aeronave','id_catalog']).subscribe(e => {
        this.data = e.attributes;
        this.dataSource = new MatTableDataSource(e.attributes);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        // console.log(e);
        this.prepareTable();
      }
    )
  }

  async prepareTable() {
    this.colNames = await lastValueFrom(this.apiConection.getColumnsApelidoFromPG(this.layerId));
    this.tableHeader = Object.keys(this.data[0]).filter(e => Object.keys(this.colNames).includes(e));

    this.tableHeader.push('act')
    this.isLoading = false;
  }

  async getLayer(id: string) {
    var itemCatalog = await lastValueFrom(this.apiConection.getLayerInfo(Number(id))) as layerCatalogItem;
    var layer = this.layersMng.createVectorTile(itemCatalog, false) as TileLayer<TileWMS>
    layer.setProperties({ 'imgThumb': './assets/images/tileThumbs/drone-gray-100.png' })
    return layer;
  }

  async addDroneTile(id: string) {
    var layer = await this.getLayer(id);
    if (!this.asLayer) {
      this.geoservice.droneTiles.push(layer);
      this.geoservice.droneTileAdded.push(true);
    }
    else {
      this.geoservice.addLayerToMapAndSidebar({ id: layer.get('id'), layer: layer, name: layer.get('name'), order: 0, legendOn: false, cat: 'img_drone' } as listItem)
    }
  }

  removeDroneTile(id: string) {
    var layer = this.geoservice.map.getAllLayers().filter(e => e.get('id') === id)[0];

    if (!this.asLayer) {
      this.geoservice.droneTiles = this.geoservice.droneTiles.filter(e => e.get('id') != id);
      if (this.geoservice.selectedTileSource == layer) this.geoservice.setTileSource(this.geoservice.tileSources[0]);
      this.geoservice.droneTileAdded.shift()
    }
    else {
      this.geoservice.removeLayerFromMapAndSidebar({id: id, layer: layer})
    }
  }

  isAdded(id) {
    if (!this.asLayer) {
      if (this.geoservice.droneTiles.find(e => e.get('id') === id)) return true;
      else false;
    }
    else {
      if (this.geoservice.mainLayers.find(e => e.id == id)) return true;
      else false;
    }
  }

  close() {
    this.dialogRef.close();
  }


  applyFilter(filterValue: string) {
    filterValue = filterValue.trim(); // Remove whitespace
    filterValue = filterValue.toLowerCase(); // Datasource defaults to lowercase matches
    this.dataSource.filter = filterValue;
  }

}
