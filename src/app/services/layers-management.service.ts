import { Injectable } from "@angular/core";
import GeoJSON from 'ol/format/GeoJSON.js';
import { ImageWMS, OSM, TileWMS, Vector as VectorSource, VectorTile as VectorTileS } from 'ol/source.js';
import VectorTile from "ol/layer/VectorTile";
import TileLayer from 'ol/layer/Tile';
import Style from "ol/style/Style";
import Fill from "ol/style/Fill";
import VectorLayer from "ol/layer/Vector";
import XYZ from "ol/source/XYZ";
import Stroke from "ol/style/Stroke";
import { stylesMngService } from "./styles-managment.service";
import Circle from "ol/style/Circle";
import { createXYZ } from 'ol/tilegrid'
import { Draw } from "ol/interaction";
import { MultiPoint, SimpleGeometry, Point } from "ol/geom";
import { Icon } from "ol/style";
import { Feature } from "ol";
import { HttpClient } from "@angular/common/http";
import { lastValueFrom } from "rxjs";
import { Extent, getWidth } from "ol/extent";
import { Layer } from "ol/layer";
import { ServerType } from "ol/source/wms";
import { ApisConectionService } from "./apis-conection.service";
import TileGrid from "ol/tilegrid/TileGrid";
import { get as getProjection } from 'ol/proj.js';
import ImageLayer from "ol/layer/Image";
import LayerGroup from "ol/layer/Group";

export interface layerCatalogItem {
  acesso: string
  apelido: string
  auto_load: string
  categ_tema: string
  columns_gs: string
  feat_apelido: string
  filtraveis: string
  fonte: string,
  fonte_back: string,
  gid: number
  labels: string
  pk_name: string,
  fk_name: string,
  tab_name: string
  tab_schema: string
  tipo: string,
  clicavel: boolean,
  rotulo: boolean,
  cluster_mode: string,
}

export interface filtersUrlTile {
  propertyName?: string[],
  bbox?: Extent,
  attributes?: { name: string, value: string | number, operation: string }[]
};

export interface responseGeoserver {
  crs: string,
  features: { geometry: { coordinates: number[][], type: string }[], geometry_name: string, id: string, properties: object, type: string }[],
  numberMatched: number,
  numberReturned: number,
  timeStamp: string,
  totalFeatures: number,
  type: string
}

export interface responseGeoserverPlus {
  crs: string,
  features: { geometry: { coordinates: number[][], type: string }[], geometry_name: string, id: string, properties: object, type: string }[],
  numberMatched: number,
  numberReturned: number,
  timeStamp: string,
  totalFeatures: number,
  type: string,
  layerId: string,
  layerName: string,
  fonteGS_front: string,
  fonteGS_back: string,
  pk_name: string,
  fk_name: string,
  cluster_mode: string,
  feat_apelid: string,
}

export interface mappingResultObject {
  layerId: string,
  layerName: string,
  fonteGS_front: string
  fonteGS_back: string,
  pk_name: string,
  pk_value: number,
  geomFeature: undefined | Feature,
  nameFeature: undefined | string,
  cluster_mode?: string,
  cluster_name?: string
}

@Injectable()
export class LayersManagementService {

  styles = this.stylesMng.layerStyles;

  constructor(private apiConection: ApisConectionService, private stylesMng: stylesMngService, private http: HttpClient) { };

  createWMSTiledSource(layer: string) {

    const projExtent = getProjection('EPSG:4326').getExtent();
    const startResolution = getWidth(projExtent) / 256;
    const resolutions = new Array(22);
    for (let i = 0, ii = resolutions.length; i < ii; ++i) {
      resolutions[i] = startResolution / Math.pow(2, i);
    }
    const tileGrid = new TileGrid({
      extent: projExtent,
      resolutions: resolutions,
      tileSize: [512, 512],
    });
    var layerParams = { LAYERS: layer };

    var sourceOptions = {
      url: this.apiConection.geoserverURL + 'wms?',
      params: layerParams,
      serverType: 'geoserver' as ServerType,
      projection: 'EPSG:4326',
      transition: 0,
      tileGrid: tileGrid,
    };
    var WMSTileSource = new TileWMS(sourceOptions);

    return WMSTileSource;
  }

  createVectorTile(layerItem: layerCatalogItem, rotulo: boolean = false) {

    const properties_ = {
      'name': layerItem.apelido,
      'id': layerItem.gid,
      'fonteGS_front': layerItem.fonte,
      'fonteGS_back': layerItem.fonte_back,
      'pk_name': layerItem.pk_name,
      'category': layerItem.categ_tema,
      'filtersUrlTile': undefined,
      'clicavel': layerItem.clicavel,
      'fk_name': layerItem.fk_name,
      'cluster_mode': layerItem.cluster_mode,
      'feat_apelido': layerItem.feat_apelido,
      'filtros': ['gid']
    }

    const tileLayer = new TileLayer({
      source: this.createWMSTiledSource(layerItem.fonte),
      properties: properties_
    })

    if (!rotulo) {
      return tileLayer
    }
    else {
      return new LayerGroup({
        layers: [
          tileLayer,
          new ImageLayer({
            source: new ImageWMS({
              url: this.apiConection.geoserverURL + 'wms?',
              params: { LAYERS: layerItem.fonte, STYLES: layerItem.fonte + '_rotulo' },
              serverType: 'geoserver' as ServerType,
              projection: 'EPSG:4326',
            }),
            properties: {
              'name': layerItem.apelido,
              'id': layerItem.gid,
            }
          })
        ],
        properties: properties_
      })
    }
  }

  async getLayersFromPG(id?: number): Promise<any[]> {
    var layerList = [];

    // Fazer aqui a requisição para o banco das informações da tabela "layer_catalog"
    if (!id) {
      var layerCatalog = await lastValueFrom(this.apiConection.getLayerCatalog());
    }
    else {
      var layerCatalog = [await lastValueFrom(this.apiConection.getLayerInfo(id))] as any[];
    }

    // // Para cada resultado
    layerCatalog.forEach(layerItem => {

      // Caso a fonte seja "wms_geoserver"
      if (layerItem['tipo'].toLowerCase() === 'wms_geoserver') {
        // Caso a categoria seja "img_drone" ignora a importação da camada
        if (layerItem['categ_tema'].toLowerCase() === 'img_drone') return;

        var vectorLayer = this.createVectorTile(layerItem, layerItem['rotulo']);
        layerList.push(vectorLayer);
      }
    })
    return layerList;
  }

  layersWMSRotulosList: string[] = [];
  layerWMSRotulos = new ImageLayer({
    source: new ImageWMS({
      url: this.apiConection.geoserverURL + 'wms?',
      params: { LAYERS: this.layersWMSRotulosList, STYLES: this.layersWMSRotulosList },
      serverType: 'geoserver' as ServerType,
      projection: 'EPSG:4326'
    }),
    properties: {
      'name': 'rotulosWMS',
      'id': 'rotulosWMS',
    }
  });

  updateLayerWMSRotulo(layer: string) {
    if (this.layersWMSRotulosList.includes(layer)) this.layersWMSRotulosList.filter(e => e !== layer);
    else this.layersWMSRotulosList.push(layer);

    this.layerWMSRotulos.setSource(
      new ImageWMS({
        url: this.apiConection.geoserverURL + 'wms?',
        params: { LAYERS: this.layersWMSRotulosList, STYLES: this.layersWMSRotulosList.map(e => e + '_rotulo') },
        serverType: 'geoserver' as ServerType,
        projection: 'EPSG:4326'
      }))
  }

  tileSources = [
    new TileLayer({
      source: new XYZ({ url: 'http://mt0.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}', attributions: '© PMSP' }),
      properties: {
        name: '2017',
        imgThumb: './assets/images/tileThumbs/orto2017.png',
        categoria: 'Ortofotos'
      },
      extent: [-47.050, -23.51, -46.795, -23.375]
    }),

    new TileLayer({
      source: new XYZ({ url: 'https://intranet.santanadeparnaiba.sp.gov.br/sisgeo/ImagenseFotos/Tiles_Santana_Parnaiba_2017_new/{z}/{x}/{y}.jpg', attributions: '© PMSP' }),
      properties: {
        name: '2017',
        imgThumb: './assets/images/tileThumbs/orto2017.png',
        categoria: 'Ortofotos'
      },
      extent: [-47.050, -23.51, -46.795, -23.375]
    }),

    new TileLayer({
      source: new XYZ({ url: 'https://webgis.santanadeparnaiba.sp.gov.br/Tiles_2011_1_1000/{z}/{x}/{y}.jpeg', attributions: '© PMSP' }),
      properties: {
        name: '2011',
        imgThumb: './assets/images/tileThumbs/orto2011.png',
        categoria: 'Ortofotos'
      }
    })
  ];


  higthlihtOptionToInfo = {
    'polygon': new VectorLayer({
      source: new VectorSource({}),
      properties: { 'name': 'highlihtOptionToInfoPol', 'id': 'HLOptiontoInfoPol' },
      style: new Style({
        stroke: new Stroke({
          color: '#fd2929',
          width: 3,
        }),
        fill: new Fill({
          color: 'rgba(209, 30, 48, 0.3)',
        }),
      }),
      zIndex: 99999
    }),
    'line': new VectorLayer({
      source: new VectorSource({}),
      properties: { 'name': 'highlihtOptiontoInfoLin', 'id': 'HLOptiontoInfoLin' },
      style: new Style({
        stroke: new Stroke({
          color: '#fd2929',
          width: 2,
        }),
      }),
      zIndex: 99999 
    }),
    'point': new VectorLayer({
      source: new VectorSource({}),
      properties: { 'name': 'highlihtOptiontoInfoPt', 'id': 'HLOptiontoInfoPt' },
      style: new Style({
        image: new Circle({
          radius: 10,
          fill: new Fill({ color: 'rgba(209, 30, 48, 0.5)' }),
          stroke: new Stroke({
            color: 'red', width: 2
          })
        }),
      }),
      zIndex: 99999
    })
  };

  higthlihtInfo = {
    'polygon': new VectorLayer({
      source: new VectorSource({}),
      properties: { 'name': 'highlihtInfoPol', 'id': 'HLInfoPol' },
      style: new Style({
        stroke: new Stroke({
          color: '#ffc107',
          width: 3,
        }),
        fill: new Fill({
          color: 'rgba(255, 193, 7, 0.3)',
        }),
      }),
      zIndex: 99999
    }),
    'line': new VectorLayer({
      source: new VectorSource({}),
      properties: { 'name': 'highlihtInfoLin', 'id': 'HLInfoLin' },
      style: new Style({
        stroke: new Stroke({
          color: 'rgba(255, 193, 7, 0.7)',
          width: 5,
        }),
        zIndex: 99999
      }),

    }),
    'point': new VectorLayer({
      source: new VectorSource({}),
      properties: { 'name': 'highlihtInfoPt', 'id': 'HLInfoPt' },
      style: new Style({
        image: new Circle({
          radius: 10,
          // fill: new Fill({ color: 'rgba(255, 193, 7, 0.5)' }),
          stroke: new Stroke({
            color: '#ffc107', width: 2
          })
        }),
      }),
      zIndex: 99999
    })
  };


  goToCoordsLayer = new VectorLayer({
    source: new VectorSource({}),
    properties: { 'name': 'highlihtGoToCoords', 'id': 'HLGoToCoords' },
    style: (feature) => { return this.stylesMng.createTextGoToCoords(feature); },
    zIndex: 99999
  })

  tileGrid = createXYZ({
    extent: [-180, -90, 180, 90],
    tileSize: 256,
    maxResolution: 180 / 256
  });


  changeTipMeasureTool(newTip: string = 'Clique para inciar a medição') {
    this.stylesMng.tip = newTip;
  };

  setGeometryModifyStyle = (useTipPoint) => {
    this.stylesMng.setGeometryModifyStyle(useTipPoint);
  };

  setModifyActive(activate: boolean = true) {
    this.stylesMng.measureToolmodify.setActive(activate);
  };

  getModify() {
    return this.stylesMng.measureToolmodify;
  };

  measureTooldraw_l = new Draw({
    source: this.stylesMng.measureToolSource,
    type: 'LineString',
    style: (feature) => {
      return this.stylesMng.stylesFunctions['measureToolStyleFunction'](feature, true, 'LineString', this.stylesMng.tip);
    },
  });

  measureTooldraw_a = new Draw({
    source: this.stylesMng.measureToolSource,
    type: 'Polygon',
    style: (feature) => {
      return this.stylesMng.stylesFunctions['measureToolStyleFunction'](feature, true, 'Polygon', this.stylesMng.tip);
    },
  });


  measureToolvector = new VectorLayer({
    source: this.stylesMng.measureToolSource,
    style: (feature) => {
      var mainStyle = this.stylesMng.stylesFunctions['measureToolStyleFunction'](feature, true);

      // Melhorar isso aqui!!!
      const geometry = feature.getGeometry();
      var vertices;
      if (geometry instanceof SimpleGeometry) {

        if (geometry.getType() === 'Polygon') {
          vertices = geometry.getCoordinates()[0];
        }
        else {
          vertices = geometry.getCoordinates();
        }
        var points = new MultiPoint(vertices);
        var index = mainStyle.length - 1;
        var styleNew = mainStyle.at(-1);
        styleNew.setGeometry(points);
        mainStyle[index] = styleNew;
      };
      return mainStyle
    },
    zIndex: 10000
  });

  streetViewTile = new TileLayer({
    source: new OSM({
      attributions: `&copy; ${new Date().getFullYear()} Google Maps <a href="https://www.google.com/help/terms_maps/" target="_blank">Terms of Service</a>`,
      maxZoom: 19,
      url: 'https://mt{0-3}.google.com/vt/?lyrs=r&x={x}&y={y}&z={z}'
      // url: 'https://mt{0-3}.google.com/vt/?lyrs=y&x={x}&y={y}&z={z}' // Sat Hybrid
    })
  });

  // Add icon layer to OpenLayers map
  coordsIcon = [-5223089.73, -2686131.10];
  coordsView = [-5223089.73, -2686131.10];
  iconUrl = 'http://chart.apis.google.com/chart?chst=d_map_pin_icon&chld=star|FF0000';

  streetViewVector = new VectorLayer({
    zIndex: 15,
    style: new Style({
      image: new Icon({
        anchor: [0.5, 1],
        anchorXUnits: 'fraction',
        anchorYUnits: 'fraction',
        src: this.iconUrl
      })
    }),
    source: new VectorSource({
      features: [
        new Feature({
          name: 'Star',
          geometry: new Point(this.coordsIcon),
          style: new Style({
            image: new Icon({
              anchor: [0.5, 46],
              anchorXUnits: 'fraction',
              anchorYUnits: 'pixels',
              src: this.iconUrl,
              crossOrigin: 'anonymous'
            })
          })
        })
      ]
    })
  });


};
