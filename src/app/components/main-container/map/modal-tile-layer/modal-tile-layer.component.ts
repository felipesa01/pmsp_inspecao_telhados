import { Component, ElementRef, HostListener, Input, OnDestroy, OnInit } from '@angular/core';
import TileLayer from 'ol/layer/Tile';
import { GeoService } from 'src/app/services/geo.service';
import { LayersManagementService } from 'src/app/services/layers-management.service';
import { Subscription, lastValueFrom } from 'rxjs';
import { LoaderService } from 'src/app/services/loader.service';
import { ApisConectionService } from 'src/app/services/apis-conection.service';
import { Tile } from 'ol';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { DroneTilesListComponent } from 'src/app/components/drone-tiles-list/drone-tiles-list.component';


@Component({
  selector: 'app-modal-tile-layer',
  templateUrl: './modal-tile-layer.component.html',
  styleUrls: ['./modal-tile-layer.component.css']
})


export class ModalTileLayerComponent implements OnInit, OnDestroy {

  @Input('r_side') r_side: boolean;

  @HostListener('document:mousedown', ['$event']) click(event) {
    if (!this.eRef.nativeElement.contains(event.target) && this.visibleTileLayers) {
      this.visibleTileLayers = false;
    }
  };

  data: any;
  visibleTileLayers: boolean = false;
  TileLayersUniqueCat: TileLayer<any>[] = [];
  SubTileLayers: TileLayer<any>[] = [];
  categoryToExpand: string | null = null;
  sideTileLayer: string;
  isLoading: boolean = false;

  badgeVisible: boolean = true;

  loaderServiceSub: Subscription;

  constructor(private apiConection: ApisConectionService, public geoService: GeoService, public loaderService: LoaderService, private eRef: ElementRef, private dialog: MatDialog) {

    this.loaderServiceSub = this.loaderService.httpProgress().subscribe(e => {
      if (e.req.includes('web-tile-raster-sources')) {
        this.isLoading = e.loading;
      }
    })
  }

  ngOnInit() {
    if (this.r_side) this.sideTileLayer = 'selectedTileSource';
    else this.sideTileLayer = 'selectedTileSourceSec';
  }

  sorterCategories(a: string, b: string) {
    const sorterDict = {
      "ortofotos": 0,
      "tiles": 1,
      "google": 2
    }

    if (sorterDict[a.toLocaleLowerCase()] > sorterDict[b.toLocaleLowerCase()])
      return 1;
    else if (sorterDict[a.toLocaleLowerCase()] < sorterDict[b.toLocaleLowerCase()])
      return -1;
    return 0;
  }

  async loadTileLayers() {
    const tilelayers$ = this.apiConection.getTileSources();
    this.data = await lastValueFrom(tilelayers$);

    var categories = [...new Set(this.data.map(e => e.get('categoria')))].sort(this.sorterCategories) as string[];

    categories.forEach((e) => {
      let found: TileLayer<any> = this.data.find(el => el.get('categoria') === e);
      this.TileLayersUniqueCat.push(found);
    });
  }


  toggleModalTileLayer() {
    this.TileLayersUniqueCat = [];
    this.categoryToExpand = null;

    this.visibleTileLayers = !this.visibleTileLayers;
    if (this.visibleTileLayers) this.data = this.loadTileLayers();
  }

  selecTile(source: TileLayer<any>) {

    this.badgeVisible = !this.badgeVisible;

    // Remodelação HTTP request
    if (this.categoryToExpand === source['categoria']) {
      this.categoryToExpand = null;
      return
    };

    let sameCategories = this.data.filter(e =>
      e.get('categoria') === source.get('categoria')
    );
    if (sameCategories.length > 1) {
      this.SubTileLayers = this.data.filter(e => e.get('categoria') === source.get('categoria'));
      this.categoryToExpand = source.get('categoria');
    }
    else {
      this.selecTileSub(source);
      this.categoryToExpand = null;
    };
  }

  selecDroneTile() {
    if (this.categoryToExpand === 'img_drone') {
      this.categoryToExpand === null
      return
    }
    this.categoryToExpand = 'img_drone';
    this.SubTileLayers = this.geoService.droneTiles;
    this.geoService.droneTileAdded = [];
  }

  selecDroneTileSub(layer: TileLayer<any>) {
    this.geoService.map.addLayer(layer)
  }

  selecTileSub(source: TileLayer<any>) {
    if (this.r_side) {
      this.geoService.setTileSource(source);
    }
    else {
      this.geoService.setTileSourceSec(source);
    }

  }

  removeDroneTileSub(layer: TileLayer<any>) {
    this.geoService.droneTiles = this.geoService.droneTiles.filter(e => e.get('id') != layer.get('id'));
    if (this.geoService.selectedTileSource == layer) this.geoService.setTileSource(this.geoService.tileSources[0]);
  }

  openDroneTileList() {

    const dialogConfig = new MatDialogConfig();
    dialogConfig.disableClose = false;
    dialogConfig.hasBackdrop = false;
    // dialogConfig.position = { top: '10%'};
    dialogConfig.data = false;
    dialogConfig.maxWidth = '100vw'
    
    this.dialog.open(DroneTilesListComponent, dialogConfig)

  }

  ngOnDestroy(): void {
    this.loaderServiceSub.unsubscribe;
  }



}
