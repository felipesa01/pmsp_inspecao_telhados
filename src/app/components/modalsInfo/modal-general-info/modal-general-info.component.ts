import { AfterViewInit, Component, ElementRef, EventEmitter, Inject, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogConfig, MatDialog } from '@angular/material/dialog';
import { Subscription, lastValueFrom, take } from 'rxjs';
import { ApisConectionService, dataToDialogInfoSearch, objGeneralToSpecific } from 'src/app/services/apis-conection.service';
import { GeoService } from 'src/app/services/geo.service';
import { mappingResultObject } from 'src/app/services/layers-management.service';
import { ModalSearchResultsComponent } from '../../modal-search-results/modal-search-results.component';
import { constrainedMemory } from 'process';
import LayerGroup from 'ol/layer/Group';
import { ImageWMS, TileWMS } from 'ol/source';
import TileLayer from 'ol/layer/Tile';
import ImageLayer from 'ol/layer/Image';
import { ToastContainerDirective, ToastrService } from 'ngx-toastr';
import { InfoSearchFilterService } from 'src/app/services/info-search-filter.service';


export const types = {
  igual: {
    value: 1,
    text: 'Igual a (=)',
    cqlfilter: `strStripAccents(strToLowerCase("/attr/"))='/value1/'`
  },
  diferente: {
    value: 2,
    text: 'Diferente de (≠)',
    cqlfilter: `strStripAccents(strToLowerCase("/attr/"))<>'/value1/'`
  },
  contem: {
    value: 3,
    text: 'Contém',
    cqlfilter: `isLike(strStripAccents(strToLowerCase("/attr/")), '^.*/value1/.*$')=true`
  },
  naoContem: {
    value: 4,
    text: 'Não contém',
    cqlfilter: `strStripAccents(strToLowerCase("/attr/"))NOT LIKE'%/value1/%'`
  },
  nulo: {
    value: 5,
    text: 'É nulo',
    cqlfilter: `strStripAccents(strToLowerCase("/attr/"))IS NULL`
  },
  naoNulo: {
    value: 6,
    text: 'Não é nulo',
    cqlfilter: `strStripAccents(strToLowerCase("/attr/"))IS NOT NULL`
  },
  inicia: {
    value: 7,
    text: 'Inicia com',
    cqlfilter: `strStripAccents(strToLowerCase("/attr/"))LIKE'/value1/%'`
  },
  finaliza: {
    value: 8,
    text: 'Finaliza com',
    cqlfilter: `strStripAccents(strToLowerCase("/attr/"))LIKE'%/value1/'`
  },
  maior: {
    value: 9,
    text: 'Maior que',
    cqlfilter: `strStripAccents(strToLowerCase("/attr/"))>'/value1/'`
  },
  menor: {
    value: 10,
    text: 'Menor que',
    cqlfilter: `strStripAccents(strToLowerCase("/attr/"))<'/value1/'`
  },
  maiorIgual: {
    value: 11,
    text: 'Maior ou igual a',
    cqlfilter: `strStripAccents(strToLowerCase("/attr/"))>='/value1/'`
  },
  menorIgual: {
    value: 12,
    text: 'Menor ou igual a',
    cqlfilter: `strStripAccents(strToLowerCase("/attr/"))<='/value1/'`
  },
  entre: {
    value: 13,
    text: 'Entre',
    cqlfilter: `"/attr/">='/value1/'AND"/attr/"<='/value2/'`
  },
  naoEntre: {
    value: 14,
    text: 'Não está entre',
    cqlfilter: `"/attr/"<'/value1/'AND"/attr/">'/value2/'`
  },
  antes: {
    value: 15,
    text: 'Antes de',
    cqlfilter: `"/attr/"<dateParse('yyyy-MM-dd','/value1/')`
  },
  depois: {
    value: 16,
    text: 'Depois de',
    cqlfilter: `"/attr/">dateParse('yyyy-MM-dd','/value1/')`
  },
  antesDurante: {
    value: 17,
    text: 'Antes (incluso) de',
    cqlfilter: `"/attr/"<=dateParse('yyyy-MM-dd','/value1/')`
  },
  depoisDurante: {
    value: 18,
    text: 'Depois (incluso) de',
    cqlfilter: `"/attr/">=dateParse('yyyy-MM-dd','/value1/')`
  },
  igualData: {
    value: 19,
    text: 'Igual a',
    cqlfilter: `"/attr/"=dateParse('yyyy-MM-dd','/value1/')`
  },
  diferenteData: {
    value: 20,
    text: 'Diferente de',
    cqlfilter: `"/attr/" < dateParse('yyyy-MM-dd','/value1/')AND"/attr/" > dateParse('yyyy-MM-dd','/value1/')`
  },
  entreData: {
    value: 21,
    text: 'Entre',
    cqlfilter: `"/attr/" >= dateParse('yyyy-MM-dd','/value1/')AND"/attr/" <= dateParse('yyyy-MM-dd','/value2/')`
  },
  naoEntreData: {
    value: 22,
    text: 'Não está entre',
    cqlfilter: `"/attr/" < dateParse('yyyy-MM-dd','/value1/')OR"/attr/" > dateParse('yyyy-MM-dd','/value2/')`
  },
}
export const typeMapper = {
  number: {
    type: 'text',
    options: [types.igual, types.diferente, types.maior, types.menor, types.maiorIgual, types.menorIgual, types.entre, types.naoEntre],
    default: types.igual.value
  },
  int: {
    type: 'text',
    options: [types.igual, types.diferente, types.maior, types.menor, types.maiorIgual, types.menorIgual, types.entre, types.naoEntre],
    default: types.igual.value
  },
  string: {
    type: 'text',
    options: [types.igual, types.diferente, types.contem, types.naoContem, types.inicia, types.finaliza, types.nulo, types.naoNulo],
    default: types.contem.value
  },
  boolean: {
    type: 'checkbox',
    options: [types.igual],
    default: types.igual.value
  },
  date: {
    type: 'date',
    options: [types.igualData, types.diferenteData, types.depois, types.antes, types.entreData, types.naoEntreData, types.nulo, types.naoNulo],
    default: types.igualData.value
  }
}


@Component({
  selector: 'app-modal-general-info',
  templateUrl: './modal-general-info.component.html',
  styleUrls: ['./modal-general-info.component.css']
})


export class ModalGeneralInfoComponent implements OnDestroy, OnDestroy, AfterViewInit {

  @Output() outputData = new EventEmitter<objGeneralToSpecific>();
  @Input() showAttributes: boolean = true;
  @ViewChild(ToastContainerDirective)
  toastContainer: ToastContainerDirective;
  keys: string[];
  formatedKeys: {};
  geomIsPoint: boolean = false;
  layerSource: string;

  isLoading: boolean = true;
  mainData: {};

  searchIsLoading = false;

  // SEARCH MODE
  profileForm: FormGroup;
  types = types;
  typeMapper = typeMapper;


  constructor(private apiConection: ApisConectionService, public geoservice: GeoService, private isfeService: InfoSearchFilterService, public dialogRef: MatDialogRef<ModalGeneralInfoComponent>, @Inject(MAT_DIALOG_DATA) public dataObj: dataToDialogInfoSearch, private _elementRef: ElementRef, private formBuilder: FormBuilder, private dialog: MatDialog, private toastr: ToastrService) {

    this.layerSource = this.dataObj.data.fonteGS_back ? this.dataObj.data.fonteGS_back : this.dataObj.data.fonteGS_front;

    // this.geomIsPoint = this.data[0].getGeometry() instanceof Point;

    // INFO MODE
    if (this.dataObj.typeOfDialog == 'info') {

      this.apiConection.getAttributesFromPg(dataObj.data as { layerId: string, pk_name: string, pk_value: number }).pipe(take(1)).subscribe({
        next: (e) => {
          this.mainData = e.attributes[0];
          this.keys = Object.keys(this.mainData).filter((e) => e !== 'geom');
          this.formatedKeys = e.apelidos;
          this.finishLoad(this.dataObj.data, dataObj.zoomToFeature)
        },
        error: (error) => {
          this.geoservice.clearHighligthAllFeature('higthlihtInfo');
          this.isLoading = false;
        }
      })
    }
    // SEARCH OR FILTER MODE
    else if (this.dataObj.typeOfDialog == 'search' || this.dataObj.typeOfDialog == 'filter') {

      this.apiConection.getColumnsApelidoFromPG(dataObj.data.layerId).pipe(take(1)).subscribe({
        next: (e) => {
          this.keys = Object.keys(e).filter((e) => e !== 'geom');
          this.formatedKeys = e;
          this.emptyData();
        },
        error: (error) => {
          this.geoservice.clearHighligthAllFeature('higthlihtInfo');
          this.isLoading = false;
        }
      })
    }
  } //END OF CONSTRUCTOR /\

  ngAfterViewInit(): void {
    this.toastr.overlayContainer = this.toastContainer;
  }

  // COMMOM MODE
  ngOnDestroy(): void {
    let element: HTMLElement = this._elementRef.nativeElement;
    let dialog = element.parentElement.parentElement.parentElement.parentElement;
    let dialogPosition = dialog.getBoundingClientRect();
    this.geoservice.updatePositionModal(this.geoservice.dialogPositionGeneralInfo, { top: dialogPosition.top, left: dialogPosition.left });

    if (this.dataObj.typeOfDialog == 'info') {
      this.geoservice.clearHighligthFeature(this.dataObj.data.geomFeature, 'higthlihtInfo');
      this.finishLoad();
    }
  }

  close() {
    this.dialogRef.close();
  }

  // ---- INFO MODE ----
  // -------------------
  setExtend() {
    this.geoservice.map.getView().fit(this.dataObj.data.geomFeature.getGeometry().getExtent(), { padding: Array(4).fill(150), duration: 500, maxZoom: 21 });
  }

  addToStreetView() {
    // if (this.data[0].getGeometry() instanceof Point) {
    //   var p = <Point>this.data[0].getGeometry();
    //   this.geoservice.addStreetViewPoint(p.getCoordinates());
    // }
  }

  finishLoad(data: mappingResultObject | undefined = undefined, zoomToFeature: boolean = false) {
    this.geoservice.clearHighligthAllFeature('higthlihtInfo');
    if (data) this.geoservice.highligthFeature(data.geomFeature, 'higthlihtInfo');
    if (zoomToFeature) this.geoservice.map.getView().fit(data.geomFeature.getGeometry().getExtent(), { padding: Array(4).fill(150), duration: 500, maxZoom: 21 });
    this.isLoading = false;
    this.outputData.emit({ layerSource: this.layerSource, dataOrForm: this.mainData, formatedKeys: this.formatedKeys , typeMode: this.dataObj.typeOfDialog});
  }


  // --- SEARCH MODE ---
  // -------------------

  // async emptyData() {

  //   // console.log(this.geoservice.layersFiltersControl);
  //   const filtersControlKeys = Object.keys(this.geoservice.layersFiltersControl);
  //   // console.log(this.geoservice.layersFiltersControl);
  //   var layerSource = this.dataObj.data.fonteGS_back ? this.dataObj.data.fonteGS_back : this.dataObj.data.fonteGS_front;
  //   var resultType = await lastValueFrom(this.apiConection.getAttributesTypeGS(layerSource));
  //   var emptyData = {}
  //   resultType.featureTypes[0].properties.forEach(e => {

  //     if (this.keys.includes(e.name)) {
  //       if (this.dataObj.typeOfDialog == 'filter' && filtersControlKeys.includes(this.dataObj.data.layerId.toString())) {
  //         var filterFromStorage = this.geoservice.layersFiltersControl[this.dataObj.data.layerId][e.name];
  //         emptyData[e.name] = this.formBuilder.group({ value: filterFromStorage.value , type: [e.localType], mode: filterFromStorage.mode });
  //       }
  //       else emptyData[e.name] = this.formBuilder.group({ value: { main: null, second: null }, type: [e.localType], mode: [0] });

  //     }
  //   })
  //   this.mainData = emptyData;
  //   this.profileForm = this.formBuilder.group(emptyData);
  //   this.isLoading = false;
  // }

  async emptyData() {
    var resultEmpyt = this.isfeService.emptyData(Number(this.dataObj.data.layerId), this.layerSource, this.keys, this.dataObj.typeOfDialog)

    // this.mainData = (await resultEmpyt).emptyData
    this.profileForm = (await resultEmpyt).profileForm
    this.isLoading = false;
    this.outputData.emit({ layerSource: this.layerSource, dataOrForm: this.profileForm, formatedKeys: this.formatedKeys, typeMode: this.dataObj.typeOfDialog });
  }

  unsorted() {
    return 0
  }

  setValue(key: string, value: {main: string | boolean, second: string}) {
    // console.log(key, value);

    this.profileForm.get(`${key}.value`).setValue({ main: value['main'], second: value['second'] });

    // Mudar predicado em caso de inserção de valor pesquisável
    if ((value.main || value.second) && this.profileForm.get(`${key}.mode`).value == 0) {
      var type = this.profileForm.get(`${key}.type`).value
      if ((typeof value == 'string' && value == '') || !value) this.profileForm.get(`${key}.mode`).setValue(0);
      else this.profileForm.get(`${key}.mode`).setValue(this.typeMapper[type].default);
    }
  }

  getType(key: string, mode: 'raw' | 'translated') {
    // console.log(this.profileForm.get(`${key}.type`));

    if (mode == 'translated') return this.typeMapper[this.profileForm.get(`${key}.type`).value].type;
    else return this.profileForm.get(`${key}.type`).value;
  }

  getControl(key: string, str: string) {
    return this.profileForm.get(`${key}.${str}`)
  }

  getControlValue(key: string, str: string) {
    return this.getControl(key, str).value
  }

  // async onSubmit() {
  //   var cqlStrList = [];
  //   var filtersStorage = {}
  //   var key = Object.keys(this.profileForm.value);
  //   key.forEach(k => {
  //     var mode = this.profileForm.get(`${k}.mode`).value;
  //     var value = this.profileForm.get(`${k}.value`).value;
  //     if (this.dataObj.typeOfDialog == 'filter') filtersStorage[k] = { value: value, mode: mode };

  //     // Para os casos de "Nulo" e "Não nulo"
  //     if (mode == 5 || mode == 6) {
  //       // var mode = await this.profileForm.get(`${k}.mode`);
  //       var cql_ = Object.values(this.types).filter(e => e.value == mode)[0].cqlfilter.replaceAll('/attr/', k)
  //       cqlStrList.push(cql_);
  //     }
  //     //  Para os demais casos diferentes de "Excluir o campo"
  //     else if (mode != 0) {
  //       // console.log(value.main)
  //       var cql_ = Object.values(this.types).filter(e => e.value == mode)[0].cqlfilter.replaceAll('/attr/', k).replaceAll('/value1/', value.main.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());
  //       if (value.second) {
  //         cql_ = cql_.replaceAll('/value2/', value.second.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());
  //       }
  //       cqlStrList.push(cql_);
  //     }
  //   })
  //   var cqlStr = cqlStrList.join(' AND ');


  //   if (this.dataObj.typeOfDialog == 'search') {
  //     this.searchIsLoading = true;
  //     var layerSource = this.dataObj.data.fonteGS_back ? this.dataObj.data.fonteGS_back : this.dataObj.data.fonteGS_front
  //     var result = await lastValueFrom(this.apiConection.doSearchLayer(layerSource, cqlStr));
  //     this.searchIsLoading = false;
  //     if (result.features.map(e => e.properties).length > 0) {
  //       const dialogConfig = new MatDialogConfig();
  //       dialogConfig.disableClose = false;
  //       dialogConfig.hasBackdrop = true;
  //       dialogConfig.maxWidth = '100vw';
  //       dialogConfig.data = { layerData: this.dataObj.data, data: result.features.map(e => e.properties), formatedKeys: this.formatedKeys }

  //       this.dialog.open(ModalSearchResultsComponent, dialogConfig);
  //     }
  //     else {
  //       this.toastr.info(`Nenhum resultado encontrado`, undefined, { progressBar: true, timeOut: 2500, positionClass: 'inline' });
  //     }
  //   }
  //   else if (this.dataObj.typeOfDialog == 'filter') {
  //     this.setCqlFilter(cqlStr);
  //     this.geoservice.addFilterToLayer(Number(this.dataObj.data.layerId), filtersStorage);
  //   }
  // }

  async onSubmit() {
    
    var cqlResult = this.isfeService.createCqlFilter(this.profileForm, this.dataObj.typeOfDialog)

    if (this.dataObj.typeOfDialog == 'search') {
      this.searchIsLoading = true;
      var layerSource = this.dataObj.data.fonteGS_back ? this.dataObj.data.fonteGS_back : this.dataObj.data.fonteGS_front
      await this.isfeService.applySearch(layerSource, cqlResult.cqlStr, this.dataObj.data, this.formatedKeys)
      this.searchIsLoading = false;
    }
    else if (this.dataObj.typeOfDialog == 'filter') {
      this.isfeService.applyFilter(Number(this.dataObj.data.layerId), cqlResult.cqlStr, cqlResult.filtersStorage)
    }
  }

  // clearFilter() {
  //   this.setCqlFilter('');
  //   this.geoservice.removeFilterFromLayer(Number(this.dataObj.data.layerId));

  //   Object.keys(this.profileForm.controls).forEach(key => {
  //     this.profileForm.get(`${key}.mode`).setValue(0);
  //     this.profileForm.get(`${key}.value`).setValue({ main: null, second: null });
  //   })
  // }

  clearFilter() {
    this.isfeService.clearFilter(Number(this.dataObj.data.layerId))

    Object.keys(this.profileForm.controls).forEach(key => {
      this.profileForm.get(`${key}.mode`).setValue(0);
      this.profileForm.get(`${key}.value`).setValue({ main: null, second: null });
    })
  }

  // setCqlFilter(cqlString: string) {
  //   var filterExists = cqlString == '' ? false : true;
  //   var layer = this.geoservice.map.getLayers().getArray().filter(e => e.get('id') == this.dataObj.data.layerId)[0]

  //   if (layer instanceof LayerGroup) {
  //     layer.getLayers().getArray().forEach(innerLayer => {
  //       if (innerLayer instanceof TileLayer || innerLayer instanceof ImageLayer) {
  //         var source = innerLayer.getSource();
  //         if (source! instanceof TileWMS || source! instanceof ImageWMS) {
  //           source.updateParams({ 'cql_filter': cqlString });
  //           this.geoservice.isFilterd.next({ id: Number(this.dataObj.data.layerId), isFiltered: filterExists });
  //         }
  //       }
  //     });
  //   }
  //   else if (layer instanceof TileLayer) {
  //     var source = layer.getSource();
  //     if (source! instanceof TileWMS) {
  //       source.updateParams({ 'cql_filter': cqlString });
  //       this.geoservice.isFilterd.next({ id: Number(this.dataObj.data.layerId), isFiltered: filterExists });
  //     }
  //   }
  //   else console.log('Atenção aqui');
  // }


  isRange(key: string) {
    if (this.profileForm.value[key]['mode'] == 21 || this.profileForm.value[key]['mode'] == 22) return true;
    else return false;
  }



  isSearchable() {
    return Object.keys(this.profileForm.controls).map(e => this.profileForm.controls[e].value.value).some(e => e != null && e != '' ? true : false)
  }

}
