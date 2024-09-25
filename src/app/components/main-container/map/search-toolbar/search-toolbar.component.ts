import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { ToastContainerDirective, ToastrService } from 'ngx-toastr';
import Feature from 'ol/Feature';
import LayerGroup from 'ol/layer/Group';
import TileLayer from 'ol/layer/Tile';
import { lastValueFrom } from 'rxjs';
import { ApisConectionService } from 'src/app/services/apis-conection.service';
import { GeoService } from 'src/app/services/geo.service';
import { mappingResultObject, responseGeoserver } from 'src/app/services/layers-management.service';

@Component({
  selector: 'app-search-toolbar',
  templateUrl: './search-toolbar.component.html',
  styleUrls: ['./search-toolbar.component.css']
})
export class SearchToolbarComponent implements AfterViewInit {

  @ViewChild(ToastContainerDirective)
  toastContainer: ToastContainerDirective;

  searchWord: string;
  isLoading: boolean = false;
  tableData: responseGeoserver['features'];
  tableHeader: string[];
  colNames: object;
  layerTarget: TileLayer<any>;

  constructor(private apiConection: ApisConectionService, private geoservice: GeoService, private toastr: ToastrService) { }

  ngAfterViewInit(): void {
    this.toastr.overlayContainer = this.toastContainer;
  }

  compileInfoFeature(featureInfo: responseGeoserver['features'][0]) {
    var obj = {
      layerId: this.layerTarget.get('id'),
      layerName: this.layerTarget.get('name'),
      fonteGS_front: this.layerTarget.get('fonteGS_front'),
      fonteGS_back: this.layerTarget.get('fonteGS_back'),
      pk_name: this.layerTarget.get('pk_name'),
      pk_value: featureInfo.properties[this.layerTarget.get('pk_name')],
      geomFeature: new Feature({ geometry: new this.geoservice.geomTypes[featureInfo.geometry['type']](featureInfo.geometry['coordinates']) }),
      nameFeature: undefined
    }
    return obj
  }

  async compileApelidos(featureExemple: mappingResultObject) {
    this.colNames = await lastValueFrom(this.apiConection.getColumnsApelidoFromPG(featureExemple.layerId));
  }

  async openTableResult(obj, data: responseGeoserver) {
    await this.compileApelidos(obj);
    this.tableData = data.features;
    this.tableData.map(e => e['obj'] = this.compileInfoFeature(e));
    this.tableHeader = Object.keys(this.tableData[0].properties).filter(e => Object.keys(this.colNames).includes(e))
  }

  getLayer(whichTable: number): TileLayer<any> {
    var idLayer = (whichTable === 1 || whichTable === 2) ? 8 : 19;  // ATENÇÃO AQUI!!!! ID da tebela layer_catalog do banco
    var layer = this.geoservice.map.getLayers().getArray().filter(e => e.get('id') === idLayer)[0] as TileLayer<any>;

    // Caso a camada de busca não esteja no mapa, a insere
    if (!layer) {
      var item = this.geoservice.treeData.filter(e => e.item.id === idLayer)[0].item;
      this.geoservice.addLayerToMapAndSidebar(item);
      var layer = this.geoservice.map.getLayers().getArray().filter(e => e.get('id') === idLayer)[0] as TileLayer<any>;
      this.toastr.info(`A camada '${layer.get('name')}' foi inserida no mapa`, undefined, { progressBar: true, timeOut: 2500, positionClass: 'inline' });
    }

    if (layer instanceof LayerGroup) layer = layer.getLayers().getArray()[0] as TileLayer<any>;
    return layer
  }

  showResult(data: responseGeoserver, whichTable: number, word?: string, wordList?: string[]) {
    //  Nenhum resultado encontrado
    if (data.features.length === 0) {
      this.toastr.error('Nenhum resultado encontrado', undefined, { progressBar: true, timeOut: 5000, positionClass: 'inline' });
    }
    // Algum resultado encontrado
    else {
      this.layerTarget = this.getLayer(whichTable);
      var obj = this.compileInfoFeature(data.features[0]);

      // Caso o resultado da busca retone apenas 1 valor 
      if (data.features.length === 1) {

        this.geoservice.openGeneralFeatureInfo(obj, true);
      }
      else if (data.features.length > 1) {

        // Avaliar se o retorno apresenta resultado com valor exatamente igual ao pesquisado
        if (whichTable === 1) {
          var exact = data.features.filter(e => e.properties['cod_imovel'] === word)
          if (exact.length === 1) {
            var obj = this.compileInfoFeature(exact[0]);
            this.geoservice.openGeneralFeatureInfo(obj, true);
          }
          else this.openTableResult(obj, data);
        }
        else if (whichTable === 2 ) {
          var exact = data.features.filter(e => e.properties['ic_imovel'] === word)
          if (exact.length === 1) {
            var obj = this.compileInfoFeature(exact[0]);
            this.geoservice.openGeneralFeatureInfo(obj, true);
          }
          else this.openTableResult(obj, data);
        }
        else {
          var exact = data.features.filter(e => e.properties['nome'].replaceAll('.', '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === word);
          exact = exact.filter(e => e.properties['tipo'].replaceAll('.', '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === wordList[0].replaceAll('.', '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());
          if (exact.length === 1) {
            var obj = this.compileInfoFeature(exact[0]);
            this.geoservice.openGeneralFeatureInfo(obj, true);
          }
          else this.openTableResult(obj, data);
        }
      }

    }
    this.isLoading = false;
  }

  tratarBuscaLogradouro(str: string) {
    var strNew = str.split(' ');

    var values = ['rua', 'av', 'avenida', 'alameda', 'al', 'via', 'est', 'estrada', 'viela', 'ponte', 'pça', 'praça', 'lgo', 'largo', 'calçada', 'calc']
    if (strNew.length > 1 && values.includes(strNew[0].replaceAll('.', '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase())) {
      return [strNew[0], strNew.slice(1,).join(' ')];
    }
    else return [str]
  }

  async doSearch() {
    this.resetSearch();
    this.searchWord = this.searchWord.trim().replaceAll('.', '').replaceAll('  ', ' ');
    if (!this.searchWord || this.searchWord === '') return;

    this.isLoading = true;
    var word = this.searchWord.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    let isnum = /^\d+$/.test(this.searchWord);
    var whichTable: number;

    if (isnum) {
      if (this.searchWord.length <= 6) {
        whichTable = 1;
      }
      else {
        whichTable = 2;
      }
      var result = await lastValueFrom(this.apiConection.doSearch(whichTable, word));
      this.showResult(result, whichTable, word);
    }
    else {
      whichTable = 3
      var wordsList = this.tratarBuscaLogradouro(word);
      var word = wordsList.length === 1 ? wordsList[0] : wordsList[1];
      var result = await lastValueFrom(this.apiConection.doSearch(whichTable, word));
      this.showResult(result, whichTable, word, wordsList);
    }
  }

  onKeyup(event: KeyboardEvent) {
    const key = event.keyCode || event.charCode;
    if (key === 13) {               // enter (cr)
      this.doSearch();
    } else if (
      key === 8 || key === 46 ||    // backspace or delete
      (key === 8 && 17) ||          // backspace + ctrl
      (key === 8 && 16) ||          // backspace + shift
      (key === 46 && 17)            // delete + ctrl
    ) {
      if (this.searchWord?.length === 0) {
        this.resetSearch();
        this.clearSearch();
      }
    }
  }

  resetSearch() {
    // this.dialog.closeAll();
    this.toastr.clear();
    this.tableData = undefined;
  }

  clearSearch() {
    this.resetSearch();
    this.searchWord = undefined;
  }


  getMatTooltip(term: string, limit:number): string {
    if (term) return term.length > limit ? term : undefined;
    else return undefined;
  }

  onTableClick(obj: mappingResultObject) {
    this.geoservice.openGeneralFeatureInfo(obj, true);
    this.resetSearch();
  }

}
