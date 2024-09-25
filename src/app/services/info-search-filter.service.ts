import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ApisConectionService } from './apis-conection.service';
import { lastValueFrom } from 'rxjs';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { mappingResultObject } from './layers-management.service';
import { ModalSearchResultsComponent } from '../components/modal-search-results/modal-search-results.component';
import { GeoService } from './geo.service';
import LayerGroup from 'ol/layer/Group';
import ImageLayer from 'ol/layer/Image';
import TileLayer from 'ol/layer/Tile';
import { TileWMS, ImageWMS } from 'ol/source';

export const types = {
  igual: {
    value: 1,
    text: 'Igual a (=)',
    cqlfilter: `strStripAccents(strToLowerCase(/attr/))='/value1/'`
  },
  diferente: {
    value: 2,
    text: 'Diferente de (≠)',
    cqlfilter: `strStripAccents(strToLowerCase(/attr/))<>'/value1/'`
  },
  contem: {
    value: 3,
    text: 'Contém',
    cqlfilter: `isLike(strStripAccents(strToLowerCase(/attr/)), '^.*/value1/.*$')=true`
  },
  naoContem: {
    value: 4,
    text: 'Não contém',
    cqlfilter: `strStripAccents(strToLowerCase(/attr/))NOT LIKE'%/value1/%'`
  },
  nulo: {
    value: 5,
    text: 'É nulo',
    cqlfilter: `strStripAccents(strToLowerCase(/attr/))IS NULL`
  },
  naoNulo: {
    value: 6,
    text: 'Não é nulo',
    cqlfilter: `strStripAccents(strToLowerCase(/attr/))IS NOT NULL`
  },
  inicia: {
    value: 7,
    text: 'Inicia com',
    cqlfilter: `strStripAccents(strToLowerCase(/attr/))LIKE'/value1/%'`
  },
  finaliza: {
    value: 8,
    text: 'Finaliza com',
    cqlfilter: `strStripAccents(strToLowerCase(/attr/))LIKE'%/value1/'`
  },
  maior: {
    value: 9,
    text: 'Maior que',
    cqlfilter: `strStripAccents(strToLowerCase(/attr/))>'/value1/'`
  },
  menor: {
    value: 10,
    text: 'Menor que',
    cqlfilter: `strStripAccents(strToLowerCase(/attr/))<'/value1/'`
  },
  maiorIgual: {
    value: 11,
    text: 'Maior ou igual a',
    cqlfilter: `strStripAccents(strToLowerCase(/attr/))>='/value1/'`
  },
  menorIgual: {
    value: 12,
    text: 'Menor ou igual a',
    cqlfilter: `strStripAccents(strToLowerCase(/attr/))<='/value1/'`
  },
  entre: {
    value: 13,
    text: 'Entre',
    cqlfilter: `/attr/>='/value1/'AND/attr/<='/value2/'`
  },
  naoEntre: {
    value: 14,
    text: 'Não está entre',
    cqlfilter: `/attr/<'/value1/'AND/attr/>'/value2/'`
  },
  antes: {
    value: 15,
    text: 'Antes de',
    cqlfilter: `/attr/<dateParse('yyyy-MM-dd','/value1/')`
  },
  depois: {
    value: 16,
    text: 'Depois de',
    cqlfilter: `/attr/>dateParse('yyyy-MM-dd','/value1/')`
  },
  antesDurante: {
    value: 17,
    text: 'Antes (incluso) de',
    cqlfilter: `/attr/<=dateParse('yyyy-MM-dd','/value1/')`
  },
  depoisDurante: {
    value: 18,
    text: 'Depois (incluso) de',
    cqlfilter: `/attr/>=dateParse('yyyy-MM-dd','/value1/')`
  },
  igualData: {
    value: 19,
    text: 'Igual a',
    cqlfilter: `/attr/=dateParse('yyyy-MM-dd','/value1/')`
  },
  diferenteData: {
    value: 20,
    text: 'Diferente de',
    cqlfilter: `/attr/ < dateParse('yyyy-MM-dd','/value1/') AND /attr/ > dateParse('yyyy-MM-dd','/value1/')`
  },
  entreData: {
    value: 21,
    text: 'Entre',
    cqlfilter: `/attr/ >= dateParse('yyyy-MM-dd','/value1/') AND /attr/ <= dateParse('yyyy-MM-dd','/value2/')`
  },
  naoEntreData: {
    value: 22,
    text: 'Não está entre',
    cqlfilter: `(/attr/ < dateParse('yyyy-MM-dd','/value1/') OR /attr/ > dateParse('yyyy-MM-dd','/value2/'))`
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

@Injectable({
  providedIn: 'root'
})
export class InfoSearchFilterService {

  constructor(private geoservice: GeoService, private apiConection: ApisConectionService, private dialog: MatDialog, private formBuilder: FormBuilder) { }

  async emptyData(layerId: number, layerSource: string, keys: string[], typeMode: string) {

    const filtersControlKeys = Object.keys(this.geoservice.layersFiltersControl);
    var resultType = await lastValueFrom(this.apiConection.getAttributesTypeGS(layerSource));
    var emptyData = {}
    resultType.featureTypes[0].properties.forEach(e => {

      if (keys.includes(e.name)) {
        if (typeMode == 'filter' && filtersControlKeys.includes(layerId.toString())) {
          var filterFromStorage = this.geoservice.layersFiltersControl[layerId][e.name];
          emptyData[e.name] = this.formBuilder.group({ value: filterFromStorage.value, type: [e.localType], mode: filterFromStorage.mode });
        }
        else emptyData[e.name] = this.formBuilder.group({ value: { main: null, second: null }, type: [e.localType], mode: [0] });

      }
    })
    return { emptyData: emptyData, profileForm: this.formBuilder.group(emptyData) }
  }

  createCqlFilter(profileForm: FormGroup<any>, typeMode: string) {
    var cqlStrList = [];
    var filtersStorage = {}
    var key = Object.keys(profileForm.value);
    key.forEach(k => {
      var mode = profileForm.get(`${k}.mode`).value;
      var value = profileForm.get(`${k}.value`).value;
      if (typeMode == 'filter') filtersStorage[k] = { value: value, mode: mode };
      else filtersStorage = undefined;

      // Para os casos de "Nulo" e "Não nulo"
      if (mode == 5 || mode == 6) {
        // var mode = await this.profileForm.get(`${k}.mode`);
        var cql_ = Object.values(types).filter(e => e.value == mode)[0].cqlfilter.replaceAll('/attr/', k)
        cqlStrList.push(cql_);
      }
      //  Para os demais casos diferentes de "Excluir o campo"
      else if (mode != 0) {
        // Para o caso de valor booleano
        if (typeof value.main == 'boolean') {
          var cql_ = Object.values(types).filter(e => e.value == mode)[0].cqlfilter.replaceAll('/attr/', k).replaceAll('/value1/', value.main);
        }
        else {
          var cql_ = Object.values(types).filter(e => e.value == mode)[0].cqlfilter.replaceAll('/attr/', k).replaceAll('/value1/', value.main.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());
        }
        if (value.second) {
          cql_ = cql_.replaceAll('/value2/', value.second.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());
        }
        cqlStrList.push(cql_);
      }
    })
    var cqlStr = cqlStrList.join(' AND ');
    // console.log(cqlStr);
    return { cqlStr: cqlStr, filtersStorage: filtersStorage };
  }

  async applySearch(layerSource: string, cqlStr: string, data: mappingResultObject, formatedKeys: {}) {

    var result = await lastValueFrom(this.apiConection.doSearchLayer(layerSource, cqlStr));
    if (result.features.map(e => e.properties).length > 0) {
      const dialogConfig = new MatDialogConfig();
      dialogConfig.disableClose = false;
      dialogConfig.hasBackdrop = true;
      dialogConfig.maxWidth = '100vw';
      dialogConfig.data = { layerData: data, data: result.features.map(e => e.properties), formatedKeys: formatedKeys }

      this.dialog.open(ModalSearchResultsComponent, dialogConfig);
    }
    else {
      // this.toastr.info(`Nenhum resultado encontrado`, undefined, { progressBar: true, timeOut: 2500, positionClass: 'inline' });
    }
  }

  applyFilter(layerId: number, cqlStr: string, filtersStorage: {}) {
    this.setCqlFilter(layerId, cqlStr);
    this.geoservice.addFilterToLayer(layerId, filtersStorage);
  }



  async setCqlFilter(layerId: number, cqlString: string) {
    var filterExists = cqlString == '' ? false : true;
    var layer = this.geoservice.map.getLayers().getArray().filter(e => e.get('id') == layerId)[0]
    // console.log(layer);

    var newCqlString: string

    // if (layer.get('fonteGS_back') && cqlString != '') {
    //   var fk_name = layer.get('fk_name');
    //   var values = (await lastValueFrom(this.apiConection.doSearchLayer(layer.get('fonteGS_back'), cqlString))).features.map(e => e.properties[fk_name]);
    //   newCqlString = layer.get('fk_name') + " IN (" + values.join() + ")";

    //   // var querySingle = "queryCollection('" + layer.get('fonteGS_back') + "', '" + fk_name + "', " + `'${cqlString.replaceAll("'", "''")}'` + ")"
    //   // console.log(querySingle)
    //   // newCqlString = layer.get('fk_name') + " IN (" + querySingle + ")";
    //   // console.log(newCqlString);

    //   // var querySingle = "queryCollection('" + layer.get('fonteGS_back') + "', '" + 'geom' + "', " + `'${cqlString.replaceAll("'", "''")}'` + ")"
    //   // console.log(querySingle)
    //   // newCqlString = 'intersects(centroid(geom), centroid(collectGeometries(' + querySingle + ')))';
    //   // console.log(newCqlString);
    // }
    // else {
    //   newCqlString = cqlString;
    // }

    newCqlString = cqlString;

    if (layer instanceof LayerGroup) {
      layer.getLayers().getArray().forEach(innerLayer => {
        if (innerLayer instanceof TileLayer || innerLayer instanceof ImageLayer) {
          var source = innerLayer.getSource();
          if (source! instanceof TileWMS || source! instanceof ImageWMS) {
            source.updateParams({ 'cql_filter': newCqlString });
            this.geoservice.isFilterd.next({ id: layerId, isFiltered: filterExists });
          }
        }
      });
    }
    else if (layer instanceof TileLayer) {
      var source = layer.getSource();
      if (source! instanceof TileWMS) {
        source.updateParams({ 'cql_filter': newCqlString });
        this.geoservice.isFilterd.next({ id: layerId, isFiltered: filterExists });
      }
    }
    else console.log('Atenção aqui');
  }

  clearFilter(layerId: number) {
    this.setCqlFilter(layerId, '');
    this.geoservice.removeFilterFromLayer(layerId);
  }

  getType(profileForm: FormGroup<any>, key: string, mode: 'raw' | 'translated') {
    // console.log(key);
    // console.log(profileForm.get(`${key}.type`));

    if (mode == 'translated') return typeMapper[profileForm.get(`${key}.type`).value].type;
    else return profileForm.get(`${key}.type`).value;
  }

  getControl(profileForm: FormGroup<any>, key: string, str: string) {
    return profileForm.get(`${key}.${str}`)
  }

  getControlValue(profileForm: FormGroup<any>, key: string, str: string) {
    return this.getControl(profileForm, key, str).value
  }

  isRange(profileForm: FormGroup<any>, key: string) {
    if (profileForm.value[key]['mode'] == 21 || profileForm.value[key]['mode'] == 22) return true;
    else return false;
  }



}
