import { Injectable } from '@angular/core';
import { lastValueFrom, map, mergeMap, Observable, of } from 'rxjs';
import { mappingResultObject, responseGeoserver, responseGeoserverPlus } from './layers-management.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import TileLayer from 'ol/layer/Tile';
import { XYZ } from 'ol/source';
import OsmSource from 'ol/source/OSM';
import LayerGroup from 'ol/layer/Group';
import { observableToBeFn } from 'rxjs/internal/testing/TestScheduler';
import * as moment from 'moment-timezone';
import { resourceLimits } from 'worker_threads';
import { FormGroup } from '@angular/forms';


export interface mainAPIObject {
  Success: boolean,
  Data: { RowsFound: number, Rows: any[] }
}

export interface responseGSDescribeFeatureType {
  elementFormDefault: string,
  targetNamespace: string,
  targetPrefix: string,
  featureTypes: {
    typeName: string,
    properties: {
      name: string,
      maxOccurs: number,
      minOccurs: number,
      nillable: boolean,
      type: string,
      localType: string
    }[]
  }[]
}

export interface wfsResponse {
  crs: string,
  features: { geometry: string, id: string, properties: {}, type: string }[],
  numberMatched: number,
  numberReturned: number,
  timeStamp: string,
  totalFeatures: number,
  type: string
}


export interface dataToDialogInfoSearch {
  data: mappingResultObject,
  zoomToFeature: boolean,
  typeOfDialog: 'info' | 'search' | 'edit' | 'filter'
}

export interface objGeneralToSpecific {
  layerSource: string,
  dataOrForm: {[key: string]: string} | FormGroup<any>,
  formatedKeys: {},
  typeMode: dataToDialogInfoSearch['typeOfDialog'] }


@Injectable({
  providedIn: 'root'
})
export class ApisConectionService {

  mainApiURL: string = 'https://intranet-dsv.santanadeparnaiba.sp.gov.br/SisGeo-API/';
  geoserverURL: string = this.mainApiURL + 'geoserver/'

  constructor(private http: HttpClient) { }

  getLayerCatalog(): Observable<any[]> {
    return this.http.get<mainAPIObject>(this.mainApiURL + 'layers-catalog').pipe(
      map(data => {
        if (data.Success) {
          return data.Data.Rows;
        }
        else {
          return [];
        }
      })
    )
  }

  getLayerInfo(id: number): Observable<{}> {
    return this.http.get<mainAPIObject>(this.mainApiURL + 'layers-catalog/' + id.toString()).pipe(
      map(data => {
        if (data.Success) {
          return data.Data.Rows[0];
        }
        else {
          return [];
        }
      })
    )


  }

  // getAttributesFromPg(data: { layerId: string, pk_name: string, pk_value: number }): Observable<{}> {
  //   // var layerAjust = data.fonteGS_front.split(':')[1]

  //   return this.http.get<mainAPIObject>(this.mainApiURL + 'layers-catalog/all-attributes-from-layer/' + data.layerId + '/' + data.pk_name + '=' + data.pk_value).pipe(
  //     map(data => {
  //       if (data.Success) {
  //         return data.Data.Rows[0];
  //       }
  //       else {
  //         return [];
  //       }
  //     })
  //   )
  // }

  getAttributesFromPg(data: { layerId: string, pk_name?: string, pk_value?: number }, attributes?: string[]): Observable<{ attributes: any[], apelidos: {} }> {
    // var layerAjust = data.fonteGS_front.split(':')[1]

    var atrObservable: Observable<any[]>;
    if (!attributes) {
      atrObservable = this.http.get<mainAPIObject>(this.mainApiURL + 'columns-catalog/' + data.layerId).pipe(
        map(d => {
          if (d.Success) {
            return d.Data.Rows
          }
        }))
    }
    else {
      atrObservable = of(attributes)
    }

    return atrObservable.pipe(
      map(data => { return data }),
      mergeMap<any[], Observable<any>>(columnsCatalog => {

        // Melhorar isso aqui depois. Caso o parâmetro "attributes" seja informado, não há necessidade da request acima. 
        var apelidos = {};
        columnsCatalog.map(i => {
          if (i['col_apelido']) apelidos[i['col_name']] = i['col_apelido']
          else apelidos[i['col_name']] = i['col_name']
        })

        var attributesToQuery: string
        if (attributes) attributesToQuery = attributes.join(',');
        else attributesToQuery = columnsCatalog.map(tab => tab['col_name']).join(',');

        var featureToQuery: string
        if (data.pk_name && data.pk_value) featureToQuery = '/' + data.pk_name + '=' + data.pk_value;
        else featureToQuery = ''

        return this.http.get<mainAPIObject>(this.mainApiURL + 'layers-catalog/attributes-from-layer/' + data.layerId + '/' + attributesToQuery + featureToQuery).pipe(
          map(data => {
            if (data.Success) {
              if (attributes) return { attributes: data.Data.Rows };
              else return { attributes: data.Data.Rows, apelidos: apelidos };
            }
            else {
              return [];
            }
          })
        )
      }
      )
    )

  }

  getColumnsApelidoFromPG(layerId: string): Observable<object> {
    return this.http.get<mainAPIObject>(this.mainApiURL + 'columns-catalog/' + layerId).pipe(
      map(data => {
        if (data.Success) {
          return data.Data.Rows;
        }
      }),
      map(data_ => {
        var result = {};
        data_.map(i => {
          if (i['col_apelido']) result[i['col_name']] = i['col_apelido']
          else result[i['col_name']] = i['col_name']
        })
        return result;
      })
    )
  }

  // getGeomFromGS(data: { layerSource: string, pk_name: string, pk_value: number }) {
  //   return this.http.get<{ features: {}[], numberMatched: number, numberReturned: number, timeStamp: string, totalFeatures: number, type: string }>(this.geoserverURL + 'wfs?service=WFS&version=1.0.0&request=GetFeature&typename=' + data.layerSource + '&outputFormat=application/json&srsname=EPSG:4326&cql_filter=' + encodeURI(" " + data.pk_name + " =" + data.pk_value)).pipe(
  //     map(data_ => {
  //       return data_.features[0]['geometry']
  //     })
  //   )
  // }

  // getColumnsPG(layerId: string): Observable<object> {
  //   return this.http.get<mainAPIObject>(this.mainApiURL + 'columns-catalog/' + layerId).pipe(
  //     map(data => {
  //       if (data.Success) {
  //         return data.Data.Rows;
  //       }
  //     }))
  // }

  async getFeatureNameFromGS2(data: { layerId: string, pk_name: string, pk_value: number }, namesMapped?: { values: string, sep: string }): Promise<Observable<{ values: string[]; sep: string; }>> {

    var url = this.mainApiURL + 'layers-catalog/attributes-from-layer/' + data.layerId + '/';
    var obj_

    if (namesMapped) {
      obj_ = namesMapped
    }
    else {
      var layerCatalog$ = this.http.get<mainAPIObject>(this.mainApiURL + 'layers-catalog/' + data.layerId).pipe(
        map(data_ => {
          if (data_.Success) {
            return data_.Data.Rows[0]
          }
          else return null;
        }),
        map(data_ => {
          var column_list: string;
          var first_split = data_["feat_apelido"]?.split(":");
          if (first_split.length === 1) column_list = first_split[0];
          else column_list = first_split[0].split("\\").join(',');
          return { values: column_list, sep: first_split[1] };
        }));

      obj_ = await lastValueFrom(layerCatalog$);
    }

    url = url + obj_.values + '/' + data.pk_name + '=' + data.pk_value

    return this.http.get<mainAPIObject>(url).pipe(
      map(data__ => {
        if (data__.Success) {
          var attributesValues = Object.values(data__.Data.Rows[0]).filter(e => e);
          return { values: attributesValues as string[], sep: obj_.sep as string };
        }
      })
    )
  }


  getFeatureNameFromGS(data: { layerId: string, pk_name: string, pk_value: number }, columns?: {}, namesMapped?: { values: string, sep: string }): Observable<{ values: string[], sep: string }> {
    return this.http.get<mainAPIObject>(this.mainApiURL + 'layers-catalog/' + data.layerId).pipe(
      map(data_ => {
        if (data_.Success) {
          return data_.Data.Rows[0]
        }
        else return null;
      }),
      map(data_ => {
        var column_list: string;
        var first_split = data_["feat_apelido"]?.split(":");
        if (first_split.length === 1) column_list = first_split[0];
        else column_list = first_split[0].split("\\").join(',');
        return { values: column_list, sep: first_split[1] };
      }),
      mergeMap(obj => {
        return this.http.get<mainAPIObject>(this.mainApiURL + 'layers-catalog/attributes-from-layer/' + data.layerId + '/' + obj.values + '/' + data.pk_name + '=' + data.pk_value).pipe(
          map(data__ => {
            if (data__.Success) {
              var attributesValues = Object.values(data__.Data.Rows[0]).filter(e => e);
              return { values: attributesValues as string[], sep: obj.sep as string };
            }
          })
        )
      })

    )
  }

  getAttributesTypeGS(layerSource: string): Observable<responseGSDescribeFeatureType> {
    return this.http.get<responseGSDescribeFeatureType>(this.geoserverURL +
      'wfs?service=wfs&version=2.0.0&request=DescribeFeatureType&typeNames=' + layerSource + '&outputFormat=application/json').pipe(
        map(data_ => {
          return data_
        })
      )
  }


  // ******************************************************************************
  // Pegar stilo do GeoServer
  // ******************************************************************************
  getStyleFromGS(layerString: string): Observable<string> {
    var workSpaceName = layerString.split(':')[0];
    var layerName = layerString.split(':')[1];

    return this.http.get('http://192.168.10.157:8080/geoserver/rest/workspaces/' + workSpaceName + '/styles/' + layerName + '.sld', { responseType: 'text' }).pipe(
      map(data => {
        return data.toString()
      })
    );
  }


  // ******************************************************************************
  // 
  // ******************************************************************************
  getFeatureInfoFromGS(url: string) {
    return this.http.get<responseGeoserver>(url).pipe(
      map(data => {
        return data
      })

    )
  }

  requestOnClick(vector: TileLayer<any> | LayerGroup, coord: number[], resolution: number) {
    var source;
    if (vector instanceof TileLayer) {
      source = vector.getSource()
    }
    else {
      source = (vector.getLayers().getArray() as TileLayer<any>[])[0].getSource()
    }
    var attributes = vector.get('fk_name') ? vector.get('fk_name') : vector.get('pk_name')
    attributes = attributes + ',geom'
    var url = source.getFeatureInfoUrl(coord, resolution, 'EPSG:4326', { 'INFO_FORMAT': 'application/json', 'FEATURE_COUNT': '1000', 'propertyName':  attributes});

    return <Observable<responseGeoserverPlus>>this.getFeatureInfoFromGS(url).pipe(
      map(data => {
        if (data.features.length > 0) {
          data['layerId'] = vector.get('id');
          data['layerName'] = vector.get('name');
          data['fonteGS_front'] = vector.get('fonteGS_front');
          data['fonteGS_back'] = vector.get('fonteGS_back');
          data['pk_name'] = vector.get('pk_name');
          data['fk_name'] = vector.get('fk_name');
          data['cluster_mode'] = vector.get('cluster_mode'),
          data['feat_apelido'] = vector.get('feat_apelido');
          return data;
        }
        else return;
      })
    );
  }



  getTileSources(): Observable<TileLayer<any>[]> {
    // let tileLayers: TileLayer<any>[] = [];

    return this.http.get<{ Success: boolean, Data: { Rows: [], RowsFound: number } }>(this.mainApiURL + 'web-tile-raster-sources').pipe(
      map(data => {
        const final_data = [];
        data.Data.Rows.map(e => {
          var tile = new TileLayer({ source: new XYZ({ url: e['url'], attributions: e['attributions'] }), properties: { name: e['nome'], imgThumb: e['imgthumb'], categoria: e['categoria'] } });
          final_data.push(tile);
        });
        return final_data;
      }),
      map(e => {
        e.push(new TileLayer({ source: new OsmSource(), properties: { name: 'OSM', imgThumb: './assets/images/tileThumbs/osm.png', categoria: 'OSM' } }));
        e.push(new TileLayer({ source: null, properties: { name: 'Branco', imgThumb: './assets/images/tileThumbs/blank.png', categoria: 'Branco' } }));
        return e;
      })
    );
  }

  addOsmAndBlankTile(tileLayers: TileLayer<any>[]) {
    tileLayers.push(new TileLayer({ source: new OsmSource(), properties: { name: 'OSM', imgThumb: './assets/images/tileThumbs/osm.png', categoria: 'OSM' } }));
    tileLayers.push(new TileLayer({ source: null, properties: { name: 'Branco', imgThumb: './assets/images/tileThumbs/blank.png', categoria: 'Branco' } }));

    return tileLayers;
  }



  // ******************************************************
  // ****************** Buscas ****************************


  doSearch(witch: number, wordSearch: string): Observable<responseGeoserver> {

    var layerName: string;
    var colName: string;
    var pkName: string;
    var cqlFilter: string;
    var prefix: string = "'";
    var valueToSearch = wordSearch + encodeURIComponent("%'");
    // var = 

    if (witch === 1) {
      layerName = 'pmspwebgeo:imoveis';
      colName = 'cod_imovel';
      pkName = 'gid_imovel'
      cqlFilter = colName + " LIKE " + prefix + valueToSearch;

    }
    else if (witch === 2) {
      layerName = 'pmspwebgeo:imoveis';
      colName = 'ic_imovel';
      pkName = 'gid_imovel'
      cqlFilter = colName + " LIKE " + prefix + valueToSearch;
    }
    else {
      layerName = 'pmspwebgeo:vias';
      colName = 'nome';
      pkName = 'gid,tipo' // Aqui foi necessário inserir o tipo pois o resultado com mais de um item prever a existencia do tipo para exibir ao usuário
      prefix = encodeURIComponent("'%");
      cqlFilter = 'strStripAccents(strToLowerCase(' + colName + ")) LIKE " + prefix + valueToSearch;
    }

    var url = this.geoserverURL + "wfs?service=wfs&version=2.0.0&request=GetFeature&srsName=EPSG:4326&outputFormat=application/json&propertyName=" + `${pkName},${colName},geom` + "&typeNames=" + layerName + "&cql_filter=" + cqlFilter;

    return this.getFeatureInfoFromGS(url);
  }

  doSearchLayer(layerName: string, cqlFilter: string): Observable<responseGeoserver> {

    var url = this.geoserverURL + "wfs?service=wfs&version=2.0.0&request=GetFeature&srsName=EPSG:4326&outputFormat=application/json&typeNames=" + layerName + "&cql_filter=" + cqlFilter;

    return this.getFeatureInfoFromGS(url);
  }

  getLegendURLFromGS(layerString: string): string {
    return this.geoserverURL + 'wms?service=WMS&version=1.1.0&request=GetLegendGraphic&layer=' + layerString + '&format=image/png&LEGEND_OPTIONS=fontAntiAliasing:true;forceLabels:on;wrap_limit:280;wrap:true'
  }


  // ******************************************************
  // ****************** Zoneamento ************************

  getZonasIntersectsPolygon(querySingle: string, layerName: string) {

    var cql_filter = 'INTERSECTS(geom,' + querySingle + ')'
    var url = this.geoserverURL + "wfs?service=wfs&version=2.0.0&request=GetFeature&srsName=EPSG:4326&outputFormat=application/json&typeNames=" + layerName + "&cql_filter=" + cql_filter;

    // console.log(url);
    return this.getFeatureInfoFromGS(url);

  }


  // ******************************************************************************
  // 
  // ******************************************************************************



  searchAttributesAutoComplete(layerName: string, attribute: string, value: string): Observable<string[]> {
    if (value === '') {
      return of([]);
    }

    var url = this.geoserverURL + "wfs?service=wfs&version=2.0.0&request=GetFeature&srsName=EPSG:4326&outputFormat=application/json&typeNames=" + layerName + "&propertyName=" + attribute + "&cql_filter=" + `isLike(strStripAccents(strToLowerCase("${attribute}")), '^.*${value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()}.*$')=true`;

    return this.http
      .get<wfsResponse>(url)
      .pipe(
        map(response => {
          var result = []
          response.features.forEach(e => {
            result.push(e.properties[attribute])
          })
          var sorterResults = (a: string, b: string) => {
            var aa = a.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().indexOf(value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());
            var bb = b.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().indexOf(value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());
            if (aa < bb) {
              return -1;
            }
            if (aa > bb) {
              return 1;
            }
            return 0;
          }
          return [...new Set(result)].sort(sorterResults)
        }));
  }



  dateAttributeToTimeline(layerName: string, attribute: string): Observable<{ items: moment.Moment[], max: moment.Moment, min: moment.Moment, empytitems: number }> {

    var url = this.geoserverURL + "wfs?service=wfs&version=2.0.0&request=GetFeature&srsName=EPSG:4326&outputFormat=application/json&typeNames=" + layerName + "&propertyName=" + attribute

    return this.http
      .get<wfsResponse>(url)
      .pipe(
        map(response => {
          var result = []
          var empytItems = response.features.filter(e => !e.properties[attribute]).length;
          result = response.features.filter(e => e.properties[attribute]);
          result = result.map(e => moment(e.properties[attribute]).add(3, 'h'))
          return { items: result, empytItems: empytItems }
        }),
        map(result => {
          var min = moment.min(result.items);
          var max = moment.max(result.items);

          return { items: result.items, max: max, min: min, empytitems: result.empytItems }

        }));
  }

  featuresCountGS(layerName: string, cql_filter: string): Observable<number> {
    var url = this.geoserverURL + "wfs?service=wfs&version=2.0.0&request=GetFeature&srsName=EPSG:4326&outputFormat=application/json&typeNames=" + layerName + "&cql_filter=" + cql_filter

    return this.http
      .get<wfsResponse>(url)
      .pipe(
        map(response => {
          return response.features.length
        }));
  }

}
