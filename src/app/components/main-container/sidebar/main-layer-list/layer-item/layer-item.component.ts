import { Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, Renderer2, SimpleChanges, ViewChild } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';
import { GeoService } from 'src/app/services/geo.service';
import { listItem } from '../main-layer-list.component';
import { ApisConectionService, dataToDialogInfoSearch } from 'src/app/services/apis-conection.service';
import { Subscription, lastValueFrom } from 'rxjs';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { ModalResumeLayerComponent } from 'src/app/components/modal-resume-layer/modal-resume-layer.component';
import { mappingResultObject } from 'src/app/services/layers-management.service';
import LayerGroup from 'ol/layer/Group';
import TileLayer from 'ol/layer/Tile';
import ImageLayer from 'ol/layer/Image';
import { TimelineToolbarComponent } from '../../../map/timeline-toolbar/timeline-toolbar.component';
import { VoxelInspector } from 'cesium';

@Component({
  selector: 'app-layer-item',
  templateUrl: './layer-item.component.html',
  styleUrls: ['./layer-item.component.css']
})
export class LayerItemComponent implements OnInit, OnChanges, OnDestroy {
  @Input('item') item: listItem;
  @ViewChild(MatMenuTrigger) openButton: MatMenuTrigger | undefined;
  legendIsOpened: boolean = false;
  hasTimeline = false;

  id: number;
  name: string;
  isVisible: boolean;
  isFiltred: boolean;
  isFilteredSub: Subscription;
  closeLegendSub: Subscription


  buttonList = [
    {
      id: 1,
      name: 'Informações',
      icon: 'info',
      func: () => this.openResumeModal(),
      disabled: false
    },
    {
      id: 2,
      name: 'Buscar',
      icon: 'search',
      func: (e) => this.openSearchOrFilterModal('search'),
      disabled: false
    },
    {
      id: 3,
      name: 'Enquadrar no mapa',
      icon: 'fullscreen',
      func: (e) => this.setExtent(),
      disabled: true
    },
    {
      id: 4,
      name: 'Legenda',
      icon: 'format_list_bulleted',
      func: (e) => this.toggleLegend(),
      disabled: false
    },
    {
      id: 5,
      name: 'Filtrar',
      icon: 'filter_alt',
      func: (e) => this.openSearchOrFilterModal('filter'),
      disabled: false
    },
    {
      id: 6,
      name: 'Linha do tempo',
      icon: 'timeline',
      func: (e) => this.openTimelineModal(this.id),
      disabled: true
    }
  ]

  constructor(private geoService: GeoService, private _elementRef: ElementRef, private renderer2: Renderer2, private apiConection: ApisConectionService, private dialog: MatDialog) {

    this.closeLegendSub = this.geoService.closeLegend.subscribe(e => {
      if (e && e == this.id) this.toggleLegend();
    })

  }

  async getType() {
    const layerSource = this.item.layer.get('fonteGS_back') ? this.item.layer.get('fonteGS_back') : this.item.layer.get('fonteGS_front');
    var type = await lastValueFrom(this.apiConection.getAttributesTypeGS(layerSource));
    
    if (type.featureTypes.length > 0 && type.featureTypes[0].properties.map(e => e.localType).some(e => e == 'date')) {
      this.hasTimeline = true;
    }
  }

  ngOnDestroy(): void {
    // console.log('Destruindo ' + this.item.name);
    this.closeLegendSub.unsubscribe();
    this.isFilteredSub.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // console.log(changes);
    // if (changes['secIsOpen'] && changes['secIsOpen']?.previousValue != changes['secIsOpen']?.currentValue) {
    //   this.secondaryIsOpened = changes['secIsOpen'].currentValue;
    // }
  }

  getFunctionActivation(id: number) {
    // Desativar Enquadrar e linha do tempo para todos
    if ([3].includes(id)) return false

    // Desativar Buscar, Filtrar e Legenda para imagens de drone
    if ([2,4,5].includes(id) && this.item.layer.get('category') == 'img_drone') return false

    if (id == 6) return this.hasTimeline

    return true
  }

  ngOnInit() {
    this.name = this.item.layer.get('name');
    this.id = this.item.layer.get('id');
    this.isVisible = this.item.layer.getVisible();

    this.isFilteredSub = this.geoService.isFilterd.subscribe(e => {
      if (e.id == this.id) {
        this.isFiltred = e.isFiltered;
      };
    })

    this.getType()

  }

  apply(enable: boolean) {
    this.item.layer.setVisible(enable);
  }

  setExtent() {
    this.geoService.setExtentLayer(this.item.layer, { padding: Array(4).fill(150), duration: 500 });
  }

  toggleLegend() {
    let element: HTMLElement = this._elementRef.nativeElement.parentElement.parentElement;
    var legend = element.getElementsByClassName('legend')[0];
    var legendImg = legend.getElementsByTagName('img')[0];
    var urlImage = this.apiConection.getLegendURLFromGS(this.item.layer.get('fonteGS_front'))
    this.renderer2.setAttribute(legendImg, "src", urlImage);

    this.legendIsOpened = !this.legendIsOpened;
    this.item.legendOn = this.legendIsOpened;
    this.renderer2.setStyle(legend, "display", this.legendIsOpened ? 'block' : 'none');

    // console.log('From layer-item ', this.item)
  }

  closeMenu() {
    this.openButton?.closeMenu();
  }

  removeLayer() {
    this.geoService.removeLayerFromMapAndSidebar(this.item)
  }

  openResumeModal() {
    this.geoService.openResumeLayer(this.id);
  }

  openTimelineModal(layerId: number) {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.disableClose = false;
    dialogConfig.hasBackdrop = false;
    // dialogConfig.panelClass = 'custom-mat-dialog-panel-search-in-layer'

    // dialogConfig.data = {data: this.getMappedResultObj(), zoomToFeature: false, typeOfDialog: 'search'} as dataToDialogInfoSearch
    // this.dialog.open(TimelineToolbarComponent, dialogConfig)
    this.geoService.timelineIsOpen$.next({layerId: this.id, on: true})


  }

  openSearchOrFilterModal(type: 'search' | 'filter') {
    this.geoService.openGeneralFeatureInfo(this.getMappedResultObj(), false, type, undefined)
  }

  getMappedResultObj(): mappingResultObject {
    return {
      layerId: this.item.layer.get('id'),
      layerName: this.item.layer.get('name'),
      fonteGS_front: this.item.layer.get('fonteGS_front'),
      fonteGS_back: this.item.layer.get('fonteGS_back'),
      pk_name: this.item.layer.get('pk_name'),
      pk_value: null,
      geomFeature: null,
      nameFeature: null
    }
  }

}
