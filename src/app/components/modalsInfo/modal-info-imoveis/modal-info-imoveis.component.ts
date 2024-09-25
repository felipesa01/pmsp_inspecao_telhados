import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { DomSanitizer } from '@angular/platform-browser';
import { ApisConectionService, dataToDialogInfoSearch, objGeneralToSpecific } from 'src/app/services/apis-conection.service';
import { GeoService } from 'src/app/services/geo.service';
import { LayersManagementService, mappingResultObject } from 'src/app/services/layers-management.service';
import { ModalGenericHTMLComponent } from '../../modal-generic-html/modal-generic-html.component';
import Map from 'ol/Map';
import { Collection, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import { Vector as VectorS } from 'ol/source';
import Vector from 'ol/layer/Vector';
import { defaults } from 'ol/control';
import { ConnectableObservable, from, interval, lastValueFrom, take } from 'rxjs';
import { Stroke, Style } from 'ol/style';
import LayerGroup from 'ol/layer/Group';
import { FormBuilder, FormGroup } from '@angular/forms';
import { InfoSearchFilterService, typeMapper } from 'src/app/services/info-search-filter.service';

@Component({
  selector: 'app-modal-info-imoveis',
  templateUrl: './modal-info-imoveis.component.html',
  styleUrls: ['./modal-info-imoveis.component.css']
})
export class ModalInfoImoveisComponent implements OnInit {

  colorValues = {
    'Parcelamento': '#80b1d3',
    'Gleba': '#db9907',
    'Usucapião': '#b349aa',
    'Desapropriação': '#4e954e'
  }

  dataFromGeneral: objGeneralToSpecific;
  keys: string[];
  keys_publicos: string[];
  typeMapper = typeMapper;

  searchIsLoading = false;

  vectorLayer = new Vector({ source: new VectorS({}), style: new Style({ stroke: new Stroke({ width: 2, color: 'blue' }) }) });

  map = new Map({
    layers: [],
    interactions: new Collection(),
    view: new View({
      projection: 'EPSG:4326',
      center: [-46.9212, -23.448],
      zoom: 11,
    }),
    controls: defaults({
      attribution: false,
      zoom: true,
    })
  })

  zoneamentoLayer: TileLayer<any> | LayerGroup;
  zoomedToFeature: boolean = false;

  constructor(private geoservice: GeoService, private layersService: LayersManagementService, private apiConnection: ApisConectionService, public isfeService: InfoSearchFilterService, @Inject(MAT_DIALOG_DATA) public dataObj: dataToDialogInfoSearch, private sanitized: DomSanitizer, private dialog: MatDialog, private formBuilder: FormBuilder) {

    if (this.dataObj.typeOfDialog == 'info') this.start();
  }

  async start() {
    var result = await lastValueFrom(from(this.layersService.getLayersFromPG(109))); // Atenção aqui id definido manualmente do banco
    this.zoneamentoLayer = result[0];
    this.map.addLayer(this.zoneamentoLayer);
    this.vectorLayer.getSource().addFeature(this.dataObj.data.geomFeature);
    this.map.addLayer(this.vectorLayer);
  }

  ngOnInit() {

  }

  profileForm: FormGroup<any>;
  formatedKeys: {};
  typeMode: objGeneralToSpecific['typeMode'];
  layerSource: string;
  setDataFromGeneral(e: objGeneralToSpecific) {
    this.dataFromGeneral = e;
    this.typeMode = e.typeMode;
    this.formatedKeys = e.formatedKeys;
    this.layerSource = e.layerSource;
    // console.log(this.dataFromGeneral)

    if (this.typeMode == 'info') {
      const removeKeys = ['dominialid', 'origem', 'modalidade', 'reurb', 'geom_redun', 'fonte_geo'];
      this.keys = Object.keys(this.dataFromGeneral.dataOrForm).filter(e => !removeKeys.includes(e) && !e.startsWith('b_'));
      this.keys_publicos = Object.keys(this.dataFromGeneral.dataOrForm).filter(e => e.startsWith('b_'));
    }
    else if ((this.typeMode == 'search' || this.typeMode == 'filter') && e.dataOrForm instanceof FormGroup) {
      this.profileForm = e.dataOrForm
      this.keys_publicos = Object.keys(e.formatedKeys).filter(e => e.startsWith('b_'));
      // console.log(this.profileForm)
    }
  }

  openInfoAreaUnidadeAutoma() {

  }

  openUrlMarcoLegal() {

    window.open(this.dataFromGeneral.dataOrForm['b_ml_url'], "_blank");

    // const dialogConfig = new MatDialogConfig();
    // dialogConfig.disableClose = true;
    // dialogConfig.hasBackdrop = false;
    // dialogConfig.data = {
    //   title: this.dataFromGeneral.dataOrForm['b_m_legal'],
    //   html: this.sanitized.bypassSecurityTrustHtml(`<div style="resize: both; overflow: auto; height: 80vh; width: 40vw;"> <iframe src="${this.dataFromGeneral.dataOrForm['b_ml_url']}" name="myIframe" class="w-100 h-100 d-flex"></iframe></div>`)
    // };
    // this.dialog.open(ModalGenericHTMLComponent, dialogConfig);

  }

  extent(map: Map) {
    const intvl = interval(1000).pipe(take(5));
    intvl.subscribe(e => {
      if (!this.zoomedToFeature) {
        try {
          map.getView().fit(this.vectorLayer.getSource().getFeatures()[0].getGeometry().getExtent(), { size: this.map.getSize(), padding: Array(4).fill(50), duration: 800 });

          var source;
          if (this.zoneamentoLayer instanceof TileLayer) {
            source = this.zoneamentoLayer.getSource()
          }
          else {
            source = (this.zoneamentoLayer.getLayers().getArray() as TileLayer<any>[])[0].getSource()
          }
          source.updateParams({ 'TIMESTAMP': new Date().getTime() });
          this.zoomedToFeature = true;
        } catch (e) { }
      }
    })

  }

  setTarget() {

  }

  results;
  async getZonas() {

    if (!this.zoomedToFeature) {
      this.extent(this.map);

      var item = this.geoservice.treeData.filter(e => e.item.id === 109)[0].item; // Atenção aqui!!! Valor definido a partir do layer_catalog

      var query = "querySingle('" + this.dataObj.data.fonteGS_front + "', 'geom','" + this.dataObj.data.pk_name + " = " + this.dataObj.data.pk_value + "')"
      var results = await lastValueFrom(this.apiConnection.getZonasIntersectsPolygon(query, item.layer.get('fonteGS_front')));
      this.results = results.features;
      setTimeout(() => this.map.setTarget('map_zoneamento'), 1);
    }
  }


  setValue(key: string, value: { main: string | boolean, second: string }) {
    // console.log(key, value);

    this.profileForm.get(`${key}.value`).setValue({ main: value['main'], second: value['second'] });

    // Mudar predicado em caso de inserção de valor pesquisável
    if ((value.main || value.second) && this.profileForm.get(`${key}.mode`).value == 0) {
      var type = this.profileForm.get(`${key}.type`).value
      this.profileForm.get(`${key}.mode`).setValue(typeMapper[type].default);
    }
    else if ((typeof value.main == 'string' && value.main == '') || !value) {
      this.profileForm.get(`${key}.mode`).setValue(0);
    }
  }

  clearFilter() {
    this.isfeService.clearFilter(Number(this.dataObj.data.layerId))

    Object.keys(this.profileForm.controls).forEach(key => {
      this.profileForm.get(`${key}.mode`).setValue(0);
      this.profileForm.get(`${key}.value`).setValue({ main: null, second: null });
    })
  }

  isSearchable() {
    return Object.keys(this.profileForm.controls).map(e => this.profileForm.controls[e].value.value).some(e => e != null && e != '' ? true : false)
  }

  async onSubmit() {

    var cqlResult = this.isfeService.createCqlFilter(this.profileForm, this.dataObj.typeOfDialog)

    if (this.dataObj.typeOfDialog == 'search') {
      this.searchIsLoading = true;
      var layerSource = this.dataObj.data.fonteGS_back ? this.dataObj.data.fonteGS_back : this.dataObj.data.fonteGS_front
      await this.isfeService.applySearch(layerSource, cqlResult.cqlStr, this.dataObj.data, this.formatedKeys)
      this.searchIsLoading = false;
    }
    else if (this.dataObj.typeOfDialog == 'filter') {
      // console.log(cqlResult);
      this.isfeService.applyFilter(Number(this.dataObj.data.layerId), cqlResult.cqlStr, cqlResult.filtersStorage)
    }
  }


}
