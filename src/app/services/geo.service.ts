import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import Attribution from 'ol/control/Attribution';
import Swipe from 'ol-ext/control/Swipe';
import { fromLonLat, METERS_PER_UNIT } from 'ol/proj';
import { defaults as defaultControls, Rotate, ScaleLine } from 'ol/control';
import { defaults as defaultInteractions, Draw, PinchZoom } from 'ol/interaction';
import { Injectable, NgZone, OnInit } from '@angular/core';
import { Feature } from 'ol';
import { Circle, GeometryCollection, LinearRing, LineString, MultiLineString, MultiPoint, MultiPolygon, Point, Polygon } from 'ol/geom';
import Collection from 'ol/Collection.js';
import { toGeometry, } from 'ol/render/Feature';
import RenderFeature from "ol/render/Feature";
import { LayersManagementService, mappingResultObject } from './layers-management.service';
import BaseLayer from 'ol/layer/Base';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { BehaviorSubject } from 'rxjs';
import { unByKey } from 'ol/Observable';
import { transform } from 'ol/proj';
import proj4 from 'proj4/dist/proj4';
import { register } from 'ol/proj/proj4';
import Scale from 'ol-ext/control/Scale'
import StreetView, { BtnControlSize, MapSize, Language } from 'ol-street-view';
import { Coordinate } from 'ol/coordinate';
import { SelectModalInfoService } from './select-modal-info.service';
import { ImageWMS, TileWMS, VectorTile } from 'ol/source';
import { Layer } from 'ol/layer';
import BaseVectorLayer from 'ol/layer/BaseVector';
import BaseTileLayer from 'ol/layer/BaseTile';
import BaseImageLayer from 'ol/layer/BaseImage';

import { ApisConectionService, dataToDialogInfoSearch } from './apis-conection.service';
import LayerGroup from 'ol/layer/Group';
import { OnClickComponent } from '../components/on-click/on-click.component';
import { ModalResumeLayerComponent } from '../components/modal-resume-layer/modal-resume-layer.component';
import { listItem } from '../components/main-container/sidebar/main-layer-list/main-layer-list.component';
import { ModalGoToCoordsComponent } from '../components/main-container/map/toolbox/modal-go-to-coords/modal-go-to-coords.component';
import { DomSanitizer } from '@angular/platform-browser';
import OLCesium from 'olcs';
import * as Cesium from 'cesium';
import * as THREE from 'three';
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { Cartesian3 } from 'cesium';
import { Rectangle } from 'cesium';
// import * as GLTFLoader from 'src/assets/3dfiles/GLTFLoader'
// import * as DRACOLoader from 'src/assets/3dfiles/DRACOLoader'

@Injectable()
export class GeoService implements OnInit {
  


  map3d: OLCesium;
  scene: Cesium.Scene

  public geomTypes = {
    'Point': Point,
    'LineString': LineString,
    'LinearRing': LinearRing,
    'Polygon': Polygon,
    'MultiPoint': MultiPoint,
    'MultiLineString': MultiLineString,
    'MultiPolygon': MultiPolygon,
    'GeometryCollection': GeometryCollection,
    'Circle': Circle
  }

  // Variaveis do Street View (ol-street-view)
  streetView_opt_options = {
    apiKey: null,
    size: BtnControlSize.Small,
    radius: 100,
    updatePegmanToClosestPanorama: true,
    transparentButton: true,
    // zoomOnInit: 18,
    minZoom: null,
    resizable: true,
    sizeToggler: false,
    defaultMapSize: MapSize.Expanded,
    autoLoadGoogleMaps: true,
    target: 'street-view-windows',
    language: Language.EN,
    i18n: {
      exit: 'Sair',
      exitView: 'Clique para sair do modo Google Street',
      dragToInit: 'Clique e arraste para visualizar Google Street',
      noImages: "Imagens não encontradas. Clique no mapa abaixo para visualizar outra área"
    }
  }
  streetView: StreetView = new StreetView(this.streetView_opt_options);
  streetViewIsOpen$ = new BehaviorSubject<boolean>(false);
  streetViewIsOpen = this.streetViewIsOpen$.asObservable()

  // Variaveis do Comparador de mapas (ol-ext - Swipe)
  ctrlSwipe = new Swipe();
  ctrlSwipeOrientation: 'vertical' | 'horizontal' = 'vertical';
  ctrlSwipeShowed = new BehaviorSubject<boolean>(false);
  selectedTileSourceSec: TileLayer<any>;

  // Variaveis do visualizador das coordenadas do mouse
  mousePositionWGS84: Coordinate;
  mousePositionUTM: Coordinate;

  // Variaveis da inicialização do mapa
  public map: Map;
  ngZone: NgZone;
  private readonly tileLayer: TileLayer<any>;
  // public layerList: VectorLayer<any>[] = [];
  private attribution = new Attribution({
    collapsible: false,
  });
  tileSources: TileLayer<any>[];
  selectedTileSource: TileLayer<any>;
  // mainInfoFeaturesPointFunctionSubscrition;
  mapRedering: boolean = true;
  mapResizing = new BehaviorSubject<boolean>(true);
  legend

  // MUDAR DEPOIS PARA UM SERVICE PROPRIO (Sharedata)
  resizeSidebar = new BehaviorSubject<number>(undefined);
  sidebarOpened = new BehaviorSubject<boolean>(false);

  // Observable do carregamento inicial das camadas
  layersIsLoading$ = new BehaviorSubject<boolean>(true);

  // Listas envolvidas no component Layer-lists
  mainLayers: listItem[] = [];
  secLayers: listItem[] = [];
  treeData: { item: listItem, code: string }[] = [];
  categories: string[] = [];
  layerAdded = {}

  adjustZIndex(array: listItem[]) {
    array.forEach((element) => {
      const indexToset = array.slice().reverse().indexOf(element);
      element.order = indexToset;
      element.layer.setZIndex(indexToset);
    })
  }

  closeLegend = new BehaviorSubject<number | undefined>(undefined);
  isFilterd = new BehaviorSubject<{ id: number, isFiltered: boolean }>({ id: -9999, isFiltered: false })

  addLayerToMapAndSidebar(obj: listItem) {
    this.mainLayers.push(obj);
    this.map.removeLayer(obj.layer);
    obj.layer.setOpacity(1);
    this.map.addLayer(obj.layer);
    this.adjustZIndex(this.mainLayers);
    this.layerAdded[obj.id] = true;
  }

  removeLayerFromMapAndSidebar(obj) {
    const pos = this.mainLayers.map(e => e.id).indexOf(obj.id);
    this.mainLayers.splice(pos, 1);
    this.removeLayer(obj.layer);
    obj.layer.setVisible(true);
    this.layerAdded[obj.id] = false;
  }



  constructor(private apiConection: ApisConectionService, private zone: NgZone, private layersService: LayersManagementService, private selecModal: SelectModalInfoService, private dialog: MatDialog, private generalInfoDialog: MatDialogRef<any>, private optionToinfoDialog: MatDialogRef<OnClickComponent>, public goToCoordsDialog: MatDialogRef<ModalGoToCoordsComponent>, private sanitized: DomSanitizer) {

    // Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyODdmOTA2Yy1jZjU4LTQxMWItYmY3YS1hN2Q5YzNhZGQyYTEiLCJpZCI6MjQyMjUwLCJpYXQiOjE3MjY2MjAyNTh9.rBXujTk_MJ1DKzB5HucdCIYOM7Mh5M6dq7xP22w297I";
    // window['CESIUM_BASE_URL'] = '/'

    proj4.defs("EPSG:31983", "+proj=utm +zone=23 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs");
    proj4.defs("EPSG:32723", "+proj=utm +zone=23 +south +datum=WGS84 +units=m +no_defs +type=crs");
    register(proj4);

    this.tileSources = this.layersService.tileSources
    this.selectedTileSource = this.tileSources[0];
    this.selectedTileSourceSec = this.tileSources[1];
    this.ngZone = zone;

    this.tileLayer = new TileLayer();


    this.zone.runOutsideAngular(() => this.map = new Map({
      // maxTilesLoading: 1,
      moveTolerance: 3,
      interactions: defaultInteractions().extend([
        new PinchZoom()
      ]),
      layers: [
        this.tileLayer
      ],
      view: new View({
        projection: 'EPSG:4326',
        center: [-46.9212, -23.448],
        zoom: 18,
        // extent: [-47.054, -23.549, -46.782, -23.344]
      }),
      controls: defaultControls({ attribution: false, zoom: false }).extend([
        this.attribution,

        new ScaleLine({
          units: 'metric',
        })
      ]),
    })
    );


    // Iserção das layers auxiliares
    this.map.addLayer(this.layersService.measureToolvector);
    this.map.addLayer(this.layersService.streetViewVector);
    // this.map.addLayer(this.layersService.layerWMSRotulos);


    // this.map.addLayer(this.layersService.vectorWFSTilied);

    // Object.keys(this.layersService.higthlihtInfo).forEach(e => {
    //   this.map.addLayer(this.layersService.higthlihtInfo[e]);
    // })

    // // Iserção e estilização inicial das layers principais 
    // this.getMainLayers();


    // Habilitar função principal do mapa (Obter informações ao clicar)
    this.setMainInfoFeaturesFunction();


    //  Habilitar EventListeners auxiliares do mapa
    this.map.on('change:size', (evt) => {
      this.attribution.setCollapsible(evt.target.get('size')[0] < 600);
      this.mapResizing.next(true);

    })

    this.map.on('pointermove', (evt) => {
      evt.coordinate
      this.mousePositionWGS84 = evt.coordinate;
      this.mousePositionUTM = transform(evt.coordinate, 'EPSG:4326', 'EPSG:31983');
    });

    this.map.on('loadstart', () => {
      this.mapRedering = true;
    });

    this.map.on('loadend', () => {
      this.mapRedering = false;
    })

    this.map.getView().on('change:resolution', () => {
      this.mapScale.next(this.getMapScale());
    });

    this.streetView.once('loadLib', () => {
      // this.map.addControl(this.streetView);
    });

    this.streetView.on(`streetViewInit`, () => {
      this.streetViewIsOpen$.next(true);

      this.streetView.getStreetViewPanorama().setOptions({
        addressControl: false,
        zoom: 0,
        imageDateControl: true,
        showRoadLabels: false
      });
      // Remover aviso de DESENVOLVIMENTO por falta da chave do Google Maps API
      setTimeout(() => {
        var DevelopDiv = document.getElementsByClassName('gm-style')[0];
        setTimeout(() => {
          var developModal = DevelopDiv.children[1].children[0].children[8].children[0] as HTMLElement;
          var Modal = document.getElementById('ol-street-view--panorama');
          var boxModal = Modal.children[2] as HTMLElement;
          boxModal.style.display = 'none';
          developModal.style.display = 'none';
        }, 1000)
      }, 1000)
    });

    this.streetView.on(`streetViewExit`, () => {
      this.streetViewIsOpen$.next(false);
      this.markersStreetView.forEach((e) => {
        e.setMap(null);
      });
      this.markersStreetView = [];
    });

  };

  goToCoordCloser = new BehaviorSubject<boolean>(false);

  // Iserção e estilização inicial das layers principais 
  // layerLoader = new BehaviorSubject<boolean>(false);
  // styleFromGSSUb: Subscription;

  async getMainLayers() {
    // this.layerList = await this.layersService.getLayersFromPG();
    // this.layerLoader.next(true);
    // this.layerList.forEach((e) => {
    //   this.map.addLayer(e);
    // });
  }

  changeStreetViewWindow() {
    // this.map.removeControl(this.streetView);
    this.streetView.setTarget('street-view-windows')
    // this.map.addControl(this.streetView)
  }

  ngOnInit() {
  }

  layersFiltersControl: { [key: number]: { [key: string]: { value: { main: null, second: null }, mode: number } } } = {}
  addFilterToLayer(layerId: number, filterObj: { [key: string]: { value: { main: null, second: null }, mode: number } }) {
    this.layersFiltersControl[layerId] = filterObj;
  }

  removeFilterFromLayer(layerId: number) {
    delete this.layersFiltersControl[layerId];
  }

  map3dEnabled: boolean = false;
  refreshMap() {
    this.map.getAllLayers().forEach((layer) => {

      var source = layer.getSource();
      if (source! instanceof TileWMS || source! instanceof ImageWMS) {
        source.updateParams({ 'TIMESTAMP': new Date().getTime() });
      }
    });
  };

  getMatrix(rotation: number[]) {
    var axis = new THREE.Vector3(-rotation[0], -rotation[1], -rotation[2]);
    var angle = axis.length();
    axis.normalize();
    var matrix = new THREE.Matrix4().makeRotationAxis(axis, angle);
    var final_matrix = new THREE.Matrix3().getNormalMatrix(matrix);

    var result = new Cesium.Matrix3(...final_matrix.elements);

    return result;
  }

  openCameras() {
    const fileloader = new THREE.FileLoader();

    fileloader.load('./assets/3dfiles/shots.geojson', (data) => {
      const geojson = JSON.parse(data as string);

      geojson.features.forEach(feat => {
        const coords: number[] = proj4('EPSG:32723', 'EPSG:4326', feat.properties.translation)
        // console.log(proj4('EPSG:32723', 'EPSG:4326', [302818, 7406446]))
        var position = Cesium.Cartesian3.fromDegrees(coords[0], coords[1], coords[2]);
        const rotationMatrix = this.getMatrix(feat.properties.rotation);
        const quat = Cesium.Quaternion.fromRotationMatrix(rotationMatrix) 

        try {
          var ypr = Cesium.HeadingPitchRoll.fromQuaternion(quat);
          ypr = new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(ypr.heading < 0 ? Cesium.Math.toDegrees(ypr.heading) + 90 : Cesium.Math.toDegrees(ypr.heading) - 90),
            Cesium.Math.toRadians(Cesium.Math.toDegrees(ypr.pitch) - 90),
            Cesium.Math.toRadians(ypr.roll < 0 ? ypr.roll : 180))

          var orientation = Cesium.Transforms.headingPitchRollQuaternion(position, ypr);

          const entity = this.map3d.getDataSourceDisplay().defaultDataSource.entities.add({
            model: { uri: './assets/3dfiles/models/camera.glb',
            // color: new Cesium.Color(1,1,1, 0.95),
            // colorBlendMode: Cesium.ColorBlendMode['HIGHLIGHT']
             },
            position: position,
            // orientation: Cesium.Quaternion.fromAxisAngle(result[0], result[1])
            orientation: orientation,
          });
        }
        catch (e) {
          console.log(e)
        }
      })
    });
  }


  set3dMap() {
    if (!this.map3d) {
      this.map3d = new OLCesium({ map: this.map });
      this.scene = this.map3d.getCesiumScene();
      Cesium.createWorldTerrainAsync().then(tp => this.scene.terrainProvider = tp);
    }

    this.map3dEnabled = !this.map3dEnabled
    if (this.map3dEnabled) {
      this.add3dModel();
      this.openCameras();
      this.leaveMainInfoFeaturesFunction();
    }
    else{
      this.setMainInfoFeaturesFunction();
      // this.scene.primitives.
    }
    this.map3d.setEnabled(this.map3dEnabled);

  }

  async add3dModel() {
    const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(2747102);
    this.scene.primitives.add(tileset)

    this.scene.camera.flyToBoundingSphere(tileset.boundingSphere)
  }

  // changeCursor = (e) => {
  //   var pixel = this.map.getEventPixel(e.originalEvent);
  //   var hit = this.map.hasFeatureAtPixel(pixel);
  //   this.map.getViewport().style.cursor = hit ? 'pointer' : '';
  // };

  mapScale = new BehaviorSubject<number>(0);
  getMapScale(dpi = 96) {
    var unit = this.map.getView().getProjection().getUnits();
    var resolution = this.map.getView().getResolution();
    var inchesPerMetre = 39.37;

    return resolution * METERS_PER_UNIT[unit] * inchesPerMetre * dpi;
  }

  scaleCtrl = new Scale({});
  setMapScale(scale, dpi = 96) {
    var inchesPerMetre = 39.37;
    var unit = this.map.getView().getProjection().getUnits();
    var res = scale / (METERS_PER_UNIT[unit] * inchesPerMetre * dpi)
    this.map.getView().setResolution(res);
    // this.scaleCtrl.setScale();
  }

  mainInfoFeaturesFunctionSubscrition;
  mainInfoFeaturesFunction() {
    // var evtKey = this.map.on('click', (evt) => {
    //   const evtPixelGlobal = [evt.originalEvent.pageX, evt.originalEvent.pageY];
    //   let resultsList: mappingResultObject[] = [];

    //   // Mapear as camadas e suas feições contempladas pelo click no objeto resultsList
    //   this.map.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {

    //     var pk_name = layer.get('pk_name');
    //     var pk_value = feature.get(pk_name);
    //     var obj = {
    //       layerId: layer.get('id'),
    //       layerName: layer.get('name'),
    //       fonteGS_front: layer.get('fonteGS_front'),
    //       pk_name: pk_name,
    //       pk_value: pk_value,
    //       geomFeature: undefined,
    //       nameFeature: undefined
    //     }

    //     if (obj === null) {
    //       return
    //     }
    //     // Desconsiderar camadas auxiliares
    //     if (typeof layer.get('id') === 'string') {
    //       if (['HLO', 'HLI'].some((e) => layer.get('id').includes(e))) return;
    //     }

    //     // Caso a camada da feição já tenha sido identificada em iterações anteriores, insere a feição no seu grupo (chave)
    //     resultsList.push(obj);

    //   });

    //   // Uma vez mapeado o mappingResults, definir o que acontece com o seu conteúdo
    //   // Caso não tenha nada no objeto mappingResults
    //   if (resultsList.length == 0) {
    //     return
    //   }
    //   // Caso só tenha uma feição e uma camada
    //   else if (resultsList.length == 1) {
    //     this.openGeneralFeatureInfo(resultsList[0]);
    //   }
    //   // Caso tenha mais de uma camada e/ou feição
    //   else {
    //     this.openMenuFeatures(resultsList, evtPixelGlobal, evt.map.get('size'));
    //   }
    //   evt.preventDefault();
    //   evt.stopPropagation();
    // });


    var evtKey = this.map.on('click', (evt) => {
      // console.log(this.map.getView().getResolution())
      const evtPixelGlobal = [evt.originalEvent.pageX, evt.originalEvent.pageY];
      // var resultsList: mappingResultObject[] = [];

      var l = this.map.getLayers().getArray().filter(function (item) {
        if (
          item.get('clicavel') &&
          ((item instanceof TileLayer && item.getSource() instanceof TileWMS && item.isVisible()) ||
            (item instanceof LayerGroup && item.getVisible()))
        ) return true;
        else return false;
      })

      const viewResolution = /** @type {number} */ (this.map.getView().getResolution());
      // const viewResolution = 0.0000014

      var resultsList = {
        'layerList': l,
        'resolution': viewResolution,
        'coord': evt.coordinate
      }

      this.openMenuFeatures(resultsList, evtPixelGlobal);

      evt.preventDefault();
      evt.stopPropagation();
    });

    return evtKey;
  };



  // mainInfoFeaturesFunction() {
  //   var evtKey = this.map.on('click', (evt) => {
  //     const evtPixelGlobal = [evt.originalEvent.pageX, evt.originalEvent.pageY];
  //     let mappingResults = {};
  //     let resultsList: mappingResultObject[]

  //     // Mapear as camadas e suas feições contempladas pelo click no objeto mappingResults
  //     this.map.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {

  //       var pk_name = layer.get('pk_name');
  //       var pk_value = feature.get(pk_name);
  //       var obj = {
  //         layerId: layer.get('id'),
  //         layerName: layer.get('name'),
  //         fonteGS_front: layer.get('fonteGS_front'),
  //         pk_name: pk_name,
  //         pk_value: pk_value,
  //         geomFeature: undefined
  //       }

  //       // ********************************************************************************************************************
  //       // if (feature instanceof RenderFeature) {
  //       //   const geomTypes = {
  //       //     'Point': Point,
  //       //     'LineString': LineString,
  //       //     'LinearRing': LinearRing,
  //       //     'Polygon': Polygon,
  //       //     'MultiPoint': MultiPoint,
  //       //     'MultiLineString': MultiLineString,
  //       //     'MultiPolygon': MultiPolygon,
  //       //     'GeometryCollection': GeometryCollection,
  //       //     'Circle': Circle
  //       //   }

  //       //   var inflatedCoordinates: Coordinate[][];
  //       //   if (feature['flatCoordinates_'].length === 2) {
  //       //     inflatedCoordinates = feature['flatCoordinates_'];  
  //       //   }
  //       //   else {
  //       //     inflatedCoordinates = inflateCoordinatesArray(
  //       //       feature['flatCoordinates_'], // flat coordinates
  //       //       0, // offset
  //       //       feature['ends_'], // geometry end indices
  //       //       2, // stride
  //       //     );
  //       //   }

  //       //   var properties = feature['properties_'];
  //       //   delete properties['_layer_'];

  //       //   var featureGeo = new Feature(
  //       //     Object.assign(properties, {geometry: new geomTypes[feature['type_']](inflatedCoordinates)})
  //       //   )
  //       //   feature = featureGeo;
  //       // };
  //       // ************************************************************************************************************************************************************

  //       // ************************************************************************************************************************************************************

  //       // var requestedFeature = this.getUniqueGeom(layer.get('fonteGS_front'), layer.get('pk_name'), feature['properties_'][layer.get('pk_name')])

  //       // const geom$ = this.getUniqueGeomGS(layer.get('fonteGS_front'), layer.get('pk_name'), feature['properties_'][layer.get('pk_name')]);
  //       // var data = await lastValueFrom(geom$);

  //       // feature = new Feature(
  //       //   Object.assign(data.properties, data.geometry)
  //       // );



  //       // layer.getSource()
  //       // "http://192.168.10.157:8080/geoserver/wms?&INFO_FORMAT=application/json&REQUEST=GetFeatureInfo&SERVICE=WMS&VERSION=1.1.1&LAYERS=COUNTRYPROFILES:grp_administrative_map"

  //       if (obj === null) {
  //         return
  //       }
  //       // Desconsiderar camadas auxiliares
  //       if (['HLO', 'HLI'].some((e) => layer.get('id').includes(e))) return;
  //       // Caso a camada da feição já tenha sido identificada em iterações anteriores, insere a feição no seu grupo (chave)
  //       if (Object.keys(mappingResults).includes(layer.get('name'))) {
  //         mappingResults[layer.get('name')].indexOf(obj) === -1 ? mappingResults[layer.get('name')].push(obj) : null;
  //       }
  //       //  Caso seja uma camada inedita entre as iterações, insere o grupo (chave) e a feição.
  //       else mappingResults[layer.get('name')] = [obj];
  //     });

  //     // Uma vez mapeado o mappingResults, definir o que acontece com o seu conteúdo
  //     // Caso não tenha nada no objeto mappingResults
  //     if (Object.keys(mappingResults).length == 0) {
  //       return
  //     }
  //     // Caso só tenha uma feição e uma camada
  //     else if (Object.keys(mappingResults).length == 1 && mappingResults[Object.keys(mappingResults)[0]].length == 1) {
  //       this.openGeneralFeatureInfo(mappingResults[Object.keys(mappingResults)[0]][0], Object.keys(mappingResults)[0]);
  //     }

  //     // Caso tenha mais de uma camada e/ou feição
  //     else {
  //       this.openMenuFeatures(mappingResults, evtPixelGlobal, evt.map.get('size'));
  //     }
  //     evt.preventDefault();
  //     evt.stopPropagation();
  //   });
  //   return evtKey;
  // };

  // getUniqueGeom(layerString, pk_name, pk_value) {
  //   const geom$ = this.getUniqueGeomGS(layerString, pk_name, pk_value);
  //   var data = lastValueFrom(geom$);
  //   return data;
  // }

  // getUniqueGeomGS(layerString, pk_name, pk_value) {
  //   var url = "http://192.168.10.157:8080/geoserver/wfs?service=WFS&version=1.0.0&request=GetFeature&outputFormat=application/json&srsname=EPSG:4326&typename=" + layerString + '&propertyName=geom,' + pk_name + '&cql_filter=' + pk_name + '=' + pk_value;
  //   return this.http.get(url).pipe(
  //     map(data => {
  //       return data['features'][0]
  //     })
  //   )
  // }

  // mainInfoFeaturesFunction() {
  //   var evtKey = this.map.on('click', (evt) => {
  //     const evtPixelGlobal = [evt.originalEvent.pageX, evt.originalEvent.pageY];
  //     let mappingResults = {};

  //     // Mapear as camadas e suas feições contempladas pelo click no objeto mappingResults
  //     this.map.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {

  //       if (feature === null) {
  //         return
  //       }
  //       // Desconsiderar camadas auxiliares
  //       if (['HLO', 'HLI'].some((e) => layer.get('id').includes(e))) return;
  //       // Caso a camada da feição já tenha sido identificada em iterações anteriores, insere a feição no seu grupo (chave)
  //       if (Object.keys(mappingResults).includes(layer.get('name'))) {
  //         mappingResults[layer.get('name')].indexOf(feature) === -1 ? mappingResults[layer.get('name')].push(feature) : null;
  //       }
  //       //  Caso seja uma camada inedita entre as iterações, insere o grupo (chave) e a feição.
  //       else mappingResults[layer.get('name')] = [feature];
  //     },
  //       // {
  //       //   layerFilter: (l) => {
  //       //     return !['HLO', 'HLI'].some((e) => l.get('name').includes(e))
  //       //   }
  //       // }
  //     );

  //     // Uma vez mapeado o mappingResults, definir o que acontece com o seu conteúdo
  //     // Caso não tenha nada no objeto mappingResults
  //     if (Object.keys(mappingResults).length == 0) {
  //       return
  //     }
  //     // Caso só tenha uma feição e uma camada
  //     else if (Object.keys(mappingResults).length == 1 && mappingResults[Object.keys(mappingResults)[0]].length == 1) {
  //       this.openGeneralFeatureInfo(mappingResults[Object.keys(mappingResults)[0]][0], Object.keys(mappingResults)[0]);
  //     }

  //     // Caso tenha mais de uma camada e/ou feição
  //     else {
  //       this.openMenuFeatures(mappingResults, evtPixelGlobal, evt.map.get('size'));
  //     }
  //     evt.preventDefault();
  //     evt.stopPropagation();
  //   });

  //   return evtKey;
  // };

  setMainInfoFeaturesFunction() {
    this.leaveMainInfoFeaturesFunction();
    // this.mainInfoFeaturesPointFunctionSubscrition = this.map.on('pointermove', this.changeCursor);
    this.mainInfoFeaturesFunctionSubscrition = this.mainInfoFeaturesFunction();
  };

  leaveMainInfoFeaturesFunction() {
    unByKey(this.mainInfoFeaturesFunctionSubscrition);
    // unByKey(this.mainInfoFeaturesPointFunctionSubscrition);
  };


  // Função que define a ativação/inativação do SWIPE
  setSwipeCtrl(on = true, tileAux: TileLayer<any> = this.selectedTileSourceSec) {

    // Em caso de desativando
    if (!on) {
      // Remover SWIPE
      this.map.removeControl(this.ctrlSwipe);
      this.map.removeLayer(tileAux);
      this.ctrlSwipeShowed.next(false);
    }
    // Em caso de ativando
    else {
      this.map.getLayers().insertAt(1, tileAux);
      this.ctrlSwipe.addLayer(tileAux, false);
      this.ctrlSwipe.setProperties({ position: 0.5, orientation: this.ctrlSwipeOrientation });
      this.ctrlSwipeShowed.next(true);
      this.map.addControl(this.ctrlSwipe);
    }
  }


  changeSwipeOrientation(pos: 'vertical' | 'horizontal' = undefined) {
    if (pos) {
      this.ctrlSwipeOrientation = pos
    }
    else {
      this.ctrlSwipeOrientation = this.ctrlSwipeOrientation == 'horizontal' ? 'vertical' : 'horizontal'
    }
    this.ctrlSwipe.set('orientation', this.ctrlSwipeOrientation)
  }


  /**
   * Updates zoom and center of the view.
   * @param zoom Zoom.
   * @param center Center in long/lat.
   */
  updateView(zoom = 13, center: [number, number] = [-46.9205, -23.448]): void {
    this.map.getView().setZoom(zoom);
    this.map.getView().setCenter(fromLonLat(center, 'EPSG:4326'));
  }

  /**
   * Updates target and size of the map.
   * @param target HTML container.
   */
  updateSize(target = 'map'): void {
    this.map.setTarget(target);
  }

  /**
   * Sets the source of the tile layer.
   * @param source Source.
   */
  setTileSource(source = this.selectedTileSource): void {
    this.selectedTileSource = source;
    this.tileLayer.setSource(source.getSource());
  }

  setTileSourceSec(source = this.selectedTileSourceSec): void {
    this.map.removeLayer(this.selectedTileSourceSec);
    this.map.getLayers().insertAt(1, source);
    this.ctrlSwipe.removeLayer(source);
    this.ctrlSwipe.addLayer(source, false);
    this.selectedTileSourceSec = source;
  }

  setExtentLayer(layer: Layer<any>, options: {} = { padding: Array(4).fill(150) }) {
    var extent;

    // Heatmap, VectorImageLayer, VectorTileLayer, VectorLayer
    if (layer instanceof BaseVectorLayer) {
      console.log('BaseVectorLayer');
      if (layer.getSource() instanceof VectorTile)
        var geom = new Collection<RenderFeature>(layer.getSource().getFeaturesInExtent([-47.054, -23.549, -46.782, -23.344])).getArray().map(e => toGeometry(e));
      var geomCollec = new GeometryCollection(geom);
      extent = geomCollec.getExtent();
      // extent = layer.getExtent();
    }

    // TileLayer, WebGLTileLayer
    else if (layer instanceof BaseTileLayer) {
      console.log('BaseTileLayer');
      console.log(layer);
      // extent = layer;
    }
    // ImageLayer
    else if (layer instanceof BaseImageLayer) {
      console.log('BaseImageLayer');
      console.log(layer);
    }
    if (extent) this.map.getView().fit(extent, options);
  }

  getlayers() {
    const vectorLayers = this.map.getAllLayers().filter((e) => {
      if (e instanceof VectorLayer) {
        return e
      }
    });
    return vectorLayers
  }

  removeLayer(layer: BaseLayer) {
    this.map.removeLayer(layer);
  }

  // Abrir diálogo de escolha caso o click contenha mais de uma camada e/ou feição
  openMenuFeatures(e: {}, position: number[]): void {

    const positioning = { left: (position[0] + 10).toString() + 'px', top: (position[1] + 10).toString() + 'px' };
    const dialogConfig = new MatDialogConfig();

    // dialogConfig.maxHeight = '0px';
    // dialogConfig.maxWidth = '0px';
    dialogConfig.disableClose = false;
    dialogConfig.hasBackdrop = false;
    dialogConfig.position = positioning;

    dialogConfig.data = {
      mappedMenu: e,
      left: position[0],
      top: position[1]
    };

    if (this.optionToinfoDialog instanceof MatDialogRef) this.optionToinfoDialog.close();
    this.optionToinfoDialog = this.dialog.open(OnClickComponent, dialogConfig);
  };

  closeMenuFeatures() {
    this.optionToinfoDialog.close();
  }


  chooseGeomToHighlight(feature: Feature, highlightObject: { polygon: VectorLayer<any>, line: VectorLayer<any>, point: VectorLayer<any> }) {

    if (feature.getGeometry() instanceof Polygon || feature.getGeometry() instanceof MultiPolygon) return highlightObject['polygon'];
    else if (feature.getGeometry() instanceof LineString || feature.getGeometry() instanceof MultiLineString) return highlightObject['line']
    else return highlightObject['point']
  };

  highligthFeature(feature: Feature, highlightObject: string) {

    this.clearHighligthAllFeature(highlightObject);
    var layer = this.chooseGeomToHighlight(feature, this.layersService[highlightObject]);
    this.map.addLayer(layer);
    layer.getSource().addFeature(feature);

  }

  clearHighligthFeature(feature: Feature, highlightObject: string) {

    var layer = this.chooseGeomToHighlight(feature, this.layersService[highlightObject]);
    layer.getSource().clear();
    this.map.removeLayer(layer);
  }

  clearHighligthAllFeature(highlightObject: string) {
    Object.keys(this.layersService[highlightObject]).forEach((e) => {

      if (this.map.getAllLayers().includes(this.layersService[highlightObject][e])) {
        this.layersService[highlightObject][e].getSource().clear();
        this.map.removeLayer(this.layersService[highlightObject][e]);
      };
    });
  };


  dialogPositionGeneralInfo: { top: number, left: number } = { top: 70, left: 300 }
  dialogPositionGoToCoords: { top: number, left: number } = { top: 200, left: 400 }

  updatePositionModal(data: { top: number, left: number }, values: { top: number, left: number }) {
    data.top += values.top;
    data.left += values.left;
  }

  // openGeneralFeatureInfo(feature: Feature, layerName: string) {

  //   const dialogConfig = new MatDialogConfig();
  //   dialogConfig.disableClose = false;
  //   dialogConfig.hasBackdrop = false;
  //   dialogConfig.panelClass = 'custom-mat-dialog-panel'
  //   dialogConfig.data = [feature, layerName];
  //   dialogConfig.enterAnimationDuration = 0;

  //   if (this.generalInfoDialog instanceof MatDialogRef) this.generalInfoDialog.close();

  //   const modal = this.selecModal.getComponent(layerName);
  //   setTimeout(() => {
  //     dialogConfig.position = { top: this.dialogPositionGeneralInfo.top + 'px', left: this.dialogPositionGeneralInfo.left + 'px' };
  //     this.generalInfoDialog = this.dialog.open(modal, dialogConfig);
  //   }, 100);

  // };


  // openGeneralFeatureInfo(feature: {}, layerName: string) {

  //   const dialogConfig = new MatDialogConfig();
  //   dialogConfig.disableClose = false;
  //   dialogConfig.hasBackdrop = false;
  //   dialogConfig.panelClass = 'custom-mat-dialog-panel'
  //   dialogConfig.data = [feature, layerName];
  //   dialogConfig.enterAnimationDuration = 0;

  //   if (this.generalInfoDialog instanceof MatDialogRef) this.generalInfoDialog.close();

  //   const modal = this.selecModal.getComponent(layerName);
  //   setTimeout(() => {
  //     dialogConfig.position = { top: this.dialogPositionGeneralInfo.top + 'px', left: this.dialogPositionGeneralInfo.left + 'px' };
  //     this.generalInfoDialog = this.dialog.open(modal, dialogConfig);
  //   }, 100);

  // };

  openGeneralFeatureInfo(item: mappingResultObject, zoomToFeature: boolean = false, typeOfDialog = 'info', panelClass = undefined) {

    const dialogConfig = new MatDialogConfig();
    dialogConfig.disableClose = false;
    dialogConfig.hasBackdrop = false;
    dialogConfig.panelClass = panelClass
    dialogConfig.data = { 'data': item, 'zoomToFeature': zoomToFeature, 'typeOfDialog': typeOfDialog } as dataToDialogInfoSearch;
    dialogConfig.enterAnimationDuration = 0;

    if (this.generalInfoDialog instanceof MatDialogRef) this.generalInfoDialog.close();

    const modal = this.selecModal.getComponent(Number(item.layerId));
    setTimeout(() => {
      dialogConfig.position = { top: this.dialogPositionGeneralInfo.top + 'px', left: this.dialogPositionGeneralInfo.left + 'px' };
      this.generalInfoDialog = this.dialog.open(modal, dialogConfig);
    }, 100);

  };

  openResumeLayer(id: number) {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.disableClose = false;
    dialogConfig.hasBackdrop = true;
    dialogConfig.panelClass = 'custom-mat-dialog-panel-resume'
    dialogConfig.data = id;
    // dialogConfig.enterAnimationDuration = 0;

    // if (this.generalInfoDialog instanceof MatDialogRef) this.generalInfoDialog.close();

    // dialogConfig.position = { top: this.dialogPositionGeneralInfo.top + 'px', left: this.dialogPositionGeneralInfo.left + 'px' };
    this.generalInfoDialog = this.dialog.open(ModalResumeLayerComponent, dialogConfig);
  };

  setGoToCoords(on: boolean = true) {

    if (on) {
      const dialogConfig = new MatDialogConfig();
      dialogConfig.disableClose = false;
      dialogConfig.hasBackdrop = false;
      dialogConfig.panelClass = 'custom-mat-dialog-panel-go-to-coords'
      setTimeout(() => {
        dialogConfig.position = { top: this.dialogPositionGoToCoords.top + 'px', left: this.dialogPositionGoToCoords.left + 'px' };
        this.goToCoordsDialog = this.dialog.open(ModalGoToCoordsComponent, dialogConfig);
      }, 100);

    }
    else {
      if (this.goToCoordsDialog instanceof MatDialogRef) this.goToCoordsDialog.close();
      // Apagar feições da camada!
    }

  }


  measureToolDrawStart;
  measureToolDrawEnd;
  setMeasureTool(on: boolean = true, multipleMeasure: boolean, type: string = 'Polygon') {
    this.map.getViewport().style.cursor = '';
    this.layersService.changeTipMeasureTool();
    this.map.removeInteraction(this.layersService.getModify());
    this.map.removeInteraction(this.layersService.measureTooldraw_l);
    this.map.removeInteraction(this.layersService.measureTooldraw_a);
    unByKey(this.measureToolDrawStart);
    unByKey(this.measureToolDrawEnd);
    this.setMainInfoFeaturesFunction();

    if (!multipleMeasure || !on) {
      this.clearMeasureToolVector();
    }

    if (on) {
      this.leaveMainInfoFeaturesFunction();

      this.map.getViewport().style.cursor = 'crosshair';
      this.map.addInteraction(this.layersService.getModify());
      if (type === 'LineString') {
        this.measureToolInteraction(this.layersService.measureTooldraw_l, multipleMeasure);
      }
      else {
        this.measureToolInteraction(this.layersService.measureTooldraw_a, multipleMeasure);
      }
    }

  }

  measureToolInteraction(draw: Draw, multipleMeasure: boolean) {
    this.measureToolDrawStart = draw.on('drawstart', () => {
      if (!multipleMeasure) {
        this.clearMeasureToolVector();
      }
      this.layersService.setModifyActive(false);
      this.layersService.changeTipMeasureTool('Clique para continuar medindo (duplo clique para finalizar)');
    });

    this.measureToolDrawEnd = draw.on('drawend', () => {
      this.layersService.setGeometryModifyStyle(true);
      this.layersService.setModifyActive(true);
      this.map.once('pointermove', () => {
        this.layersService.setGeometryModifyStyle(false);
      });
      this.layersService.changeTipMeasureTool('Clique para refazer a medição');
    });

    this.layersService.setModifyActive(true);
    this.map.addInteraction(draw);
  };

  clearMeasureToolVector() {
    this.layersService.measureToolvector.getSource().clear();
  }

  markersStreetView: google.maps.Marker[] = [];

  addStreetViewPoint(coords: Coordinate) {
    var markerPos = new google.maps.LatLng(coords[1], coords[0]);
    if (this.streetViewIsOpen$.value) {
      this.streetView.hideStreetView();
      this.streetViewIsOpen$.next(false);
    }


    // this.map.addControl(this.streetView);
    // pano.setPov({
    //   heading: 52,
    //   pitch: -12,
    // });
    this.streetViewIsOpen$.next(true);

    this.markersStreetView.push(
      new google.maps.Marker({
        position: markerPos,
        map: this.streetView.getStreetViewPanorama(),
        // icon: 'http://chart.apis.google.com/chart?chst=d_map_pin_icon&chld=star|FF0000',
        // title: 'Star',
        clickable: true
      })
    );
  }

  // Timeline modal
  timelineIsOpen$ = new BehaviorSubject<{ layerId: number, on: boolean }>({ layerId: 0, on: false });
  timelineIsOpen = this.timelineIsOpen$.asObservable();

  // IMAGENS DE DRONE 
  droneTiles: TileLayer<TileWMS>[] = []
  droneTileAdded: boolean[] = [];


}
