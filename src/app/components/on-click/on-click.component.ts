import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { AfterViewInit, ChangeDetectorRef, Component, HostListener, Inject, OnDestroy, OnInit, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { MatDialog, MAT_DIALOG_DATA, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { MatMenuTrigger, MatMenu } from '@angular/material/menu';
import { Feature } from 'ol';
import TileLayer from 'ol/layer/Tile';
import { forkJoin, lastValueFrom } from 'rxjs';
import { ApisConectionService } from 'src/app/services/apis-conection.service';
import { GeoService } from 'src/app/services/geo.service';
import { mappingResultObject } from 'src/app/services/layers-management.service';
import { MenuOnClickComponent } from './menu-on-click/menu-on-click.component';

export interface resultClick {
  'layerList': TileLayer<any>[],
  'resolution': number,
  'coord': number[]
}

export interface mapRecursiveResult {
  item: string | mappingResultObject | mappingResultObject[],
  children: mapRecursiveResult[] | mappingResultObject[] | []
}

@Component({
  selector: 'app-on-click',
  templateUrl: './on-click.component.html',
  styleUrls: ['./on-click.component.css']
})
export class OnClickComponent implements AfterViewInit, OnDestroy, OnInit {

  @ViewChild(MatMenuTrigger) menuTrigger: MatMenuTrigger;
  @ViewChild('menu') menu: MatMenu | undefined;

  overlayRef: OverlayRef;
  @ViewChild('overlay') overlayTemplate: TemplateRef<any>;

  @HostListener('mouseleave') onMouseLeave() {
    this.closeMyMenu();
  }

  isOpen = false;
  mappedOptions: {};
  layers: string[] = [];
  isLoading: boolean = true;

  mainData: mappingResultObject[];
  mainDataNew: mapRecursiveResult[];

  dataToExport: mapRecursiveResult[] = [];

  constructor(private apiConection: ApisConectionService,
    public dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) private data: { mappedMenu: resultClick, top: string, left: string },
    private geoService: GeoService,
    public overlay: Overlay,
    public viewContainerRef: ViewContainerRef,
    private menuOnClickDialog: MatDialogRef<MenuOnClickComponent>,
    private cdref: ChangeDetectorRef) {
  }

  ngOnInit() {
    this.getMappedMenu(this.data.mappedMenu.layerList, this.data.mappedMenu.coord, this.data.mappedMenu.resolution)
  }

  openMenuFeatures(): void {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.maxHeight = '0px';
    dialogConfig.maxWidth = '0px';
    dialogConfig.disableClose = false;
    dialogConfig.hasBackdrop = false;
    dialogConfig.position = { left: (this.data.left + 10).toString() + 'px', top: (this.data.top + 10).toString() + 'px' };
    dialogConfig.data = this.dataToExport;
    if (this.menuOnClickDialog instanceof MatDialogRef) this.menuOnClickDialog.close();
    this.menuOnClickDialog = this.dialog.open(MenuOnClickComponent, dialogConfig);
  };

  translateClusterMode(clusterMode: string): { attr: string, clusterNumbers: number[] } {
    if (!clusterMode) return { attr: undefined, clusterNumbers: undefined }
    else {
      var splitted = clusterMode.split(':');
      var numbers = splitted[1].split(',').map(e => Number(e));
      return { attr: splitted[0], clusterNumbers: numbers.sort().reverse() }
    }
  }

  sortItemFromMappingResultObject(a: mapRecursiveResult, b: mapRecursiveResult) {
    if (!a.item['cluster_name'] && !b.item['cluster_name']) return 0

    if (a.item['cluster_name'] > b.item['cluster_name']) return 1
    else if (a.item['cluster_name'] < b.item['cluster_name']) return -1
    else return 0
  }

  transformMainData() {
    this.mainDataNew = this.mainData.map(e => { return { item: e as mappingResultObject, children: [] } });
    this.layers.map(layer => {
      var dataOfLayer = this.mainDataNew.filter(d => d.item['layerName'] === layer);
      if (dataOfLayer.length > 15) {
        var translateKeys = this.translateClusterMode(dataOfLayer[0].item['cluster_mode']);
        // Remover os elementos que não podem ser agrupados por não possuírem a informação do "cluster_name"
        var unclassifiedItems = dataOfLayer.filter(e => !e.item['cluster_name'])
        dataOfLayer = dataOfLayer.filter(e => e.item['cluster_name'])
        // Caso realmente tenha alguma chave de agrupamento
        if (translateKeys.clusterNumbers) {
          var dataToExportMiddle = []
          var dataToExportLayer: mapRecursiveResult[] = [];
          // Para cada clusternumber existente, filtrar os elementos correspondentes..
          translateKeys.clusterNumbers.map((sepNumber, index) => {
            // var removeItem = [] // Lista para armazenar os valores que serão removido por não possuirem "cluster_name"
            var nameRecursiveItems = [...new Set(dataOfLayer.map(e => e.item['cluster_name'].toString().slice(0, sepNumber)))].sort()
            // console.log(removeItem, nameRecursiveItems)
            // dataToExportMiddle.push({ item: 'Sem informação', children: dataOfLayer.filter((e, index) => removeItem.includes(index)) })
            // console.log(dataToExportMiddle)
            // removeItem.forEach(indexToremove => {
            //   dataOfLayer.splice(indexToremove)
            // });   // Remover itens sem grupo

            nameRecursiveItems.map(recursiveItem => {
              var children: mapRecursiveResult[] | mappingResultObject[] | [];
              //  Primeiro nível do agrupamento. Aqui as FEIÇOES serão agrupadas.
              if (index === 0 && dataOfLayer.length > 0) {
                children = dataOfLayer.filter(e => e.item['cluster_name'].toString().startsWith(recursiveItem))
                children.sort(this.sortItemFromMappingResultObject)
                dataToExportMiddle.push({ item: recursiveItem, children: children })
              }
              //  Demais níveis do agrupamento. Aqui os GRUPOS serão agrupados.
              else {
                children = dataToExportMiddle.filter(e => e.item.toString().startsWith(recursiveItem))
                dataToExportLayer.push({ item: recursiveItem, children: children })
              }
            })
            // Caso seja a última iteração das chaves de agrupamento, insere o resultado no dataToExport
            if (index + 1 === translateKeys.clusterNumbers.length) {
              // Insere o grupo dos "sem informação", se for o caso
              if (unclassifiedItems.length > 0) dataToExportMiddle.push({ item: 'Sem informação', children: unclassifiedItems })

              if (translateKeys.clusterNumbers.length === 1) this.dataToExport.push({ item: layer, children: dataToExportMiddle })
              else this.dataToExport.push({ item: layer, children: dataToExportLayer })
            }
          })
        }
      }
      else this.dataToExport.push({ item: layer, children: dataOfLayer });
    })
    // Caso o clique só tenha feições de uma camada
    if (this.dataToExport.length === 1) {
      var dataToExportAdjust: mapRecursiveResult[] = []
      this.dataToExport[0].children.map(e => { dataToExportAdjust.push(e) });
      this.dataToExport = dataToExportAdjust
    }
    // Caso o clique tenha feições mas não foram agrupadas porque não tinham cluster_mode preenchido (não ter uma chave de agrupamento, por exemplo)
    else if (this.dataToExport.length === 0) this.dataToExport = this.mainDataNew;
  }

  doApelidoBetter(data: string): { values: string[], sep: string } {
    var column_list: string[];
    var sep: string;

    var first_split = data.split(":");
    sep = first_split.length === 1 ? ' - ' : first_split[1]
    column_list = first_split[0].split("\\");
    return { values: column_list, sep: sep };
  }

  fillNameItems(data: {}[], feat_info: { values: string[], sep: string }) {
    var compiledData = feat_info.values.map(e => data[e]);

    if ([...new Set(compiledData)].length === 1 && !compiledData[0]) return 'Sem informação'

    var label = ''
    feat_info.values.map((e, index) => {
      label = label + data[e];
      if (index + 1 != feat_info.values.length) {
        label = label + feat_info.sep;
      }
    })
    return label
  }

  async getMappedMenu(list: TileLayer<any>[], coord: number[], resolution: number) {
    var mappedMenu: mappingResultObject[] = [];
    if (list.length > 0) {
      var observables = list.map(item => this.apiConection.requestOnClick(item, coord, resolution));
      let source = forkJoin(observables);
      var result = await lastValueFrom(source);

      await Promise.all(result.map(async item => {
        if (item) {

          // Filtrar aqui o caso de a geomtria está duplicada por inconsistência no agrupamento realizado (ex. imóveis erroneamente cadastrados com loteamento diferente quando agrupados por loteamento)
          var keyToFilter = item.fk_name ? item.fk_name : item.pk_name
          var features = item.features.filter((obj1, i, arr) => 
            arr.findIndex(obj2 => (obj2.properties[keyToFilter] === obj1.properties[keyToFilter])) === i
          )

          await Promise.all(features.map(async f => {
            var pk_name = item['pk_name'];
            var pkMode: boolean;
            var columnToSearch: string
            var valueToSearch: string;
            // Definição dos atributos que serão usados para primeira consulta -> gid e todos usados para definir o nome da feição (coluna feat_apelido do layer_catalog)
            var attributesConcat: string[] = [...new Set([item['pk_name']].concat(this.doApelidoBetter(item['feat_apelido']).values))]

            if (item['fk_name']) {
              pkMode = true;
              columnToSearch = item['fk_name'];
              valueToSearch = f.properties[item['fk_name']];
              // attributesConcat = item['pk_name'] + ',' + this.doApelidoBetter(item['feat_apelido']).values.join(',');
            }
            else {
              pkMode = false;
              columnToSearch = item['pk_name']
              valueToSearch = f.properties[pk_name]
              // attributesConcat = item['pk_name'] + ',' + this.doApelidoBetter(item['feat_apelido']).values.join(',');
            }

            var nameFeatureFinal: string;
            var pkValueFinal: string;
            var it = await lastValueFrom(this.apiConection.getAttributesFromPg({ layerId: item['layerId'], pk_name: columnToSearch, pk_value: Number(valueToSearch) }, attributesConcat));
            it.attributes.map(feat => {
              if (pkMode) {
                nameFeatureFinal = this.fillNameItems(it.attributes.filter(e => e[pk_name] === feat[item['pk_name']])[0], this.doApelidoBetter(item['feat_apelido']));
                pkValueFinal = feat[item['pk_name']];
              }
              else {
                nameFeatureFinal = this.fillNameItems(it.attributes[0], this.doApelidoBetter(item['feat_apelido']));
                pkValueFinal = valueToSearch;
              }
              mappedMenu.push({
                layerId: item['layerId'],
                layerName: item['layerName'],
                fonteGS_front: item['fonteGS_front'],
                fonteGS_back: item['fonteGS_back'],
                pk_name: pk_name,
                pk_value: Number(pkValueFinal),
                geomFeature: new Feature({ geometry: new this.geoService.geomTypes[f.geometry['type']](f.geometry['coordinates']) }),
                nameFeature: nameFeatureFinal,
                cluster_mode: item['cluster_mode'],
                cluster_name: feat[this.translateClusterMode(item['cluster_mode']).attr]
              });
            })


          }))

        }
      }));

      this.mainData = mappedMenu;
      this.layers = [...new Set(this.mainData.map(item => item.layerName))]
      this.transformMainData();

      if (this.mainData.length > 1) {
        // this.fillAllFeatureNameItems();
        this.openMenuFeatures();
        this.isLoading = false;
        this.closeMyMenu();
      }
      else if (this.mainData.length == 1) {
        this.featureSelected(this.mainData[0]);
        this.isLoading = false;
        this.closeMyMenu();
      }
      else {
        this.ngOnDestroy();
      }
    }
    else setTimeout(e => this.closeMyMenu(), 500);
  }

  doApelidoObj(data) {
    var column_list: string;
    var first_split = data["feat_apelido"]?.split(":");
    if (first_split.length === 1) column_list = first_split[0];
    else column_list = first_split[0].split("\\").join(',');
    return { values: column_list, sep: first_split[1] };
  }

  // async getAllSeparatorName() {
  //   var layerIds = [...new Set(this.mainData.map(e => e.layerId))];
  //   await Promise.all(layerIds.map(async e => {
  //     var layerInfo = await lastValueFrom(this.apiConection.getLayerInfo(Number(e)));
  //     this.idQuered[e] = this.doApelidoObj(layerInfo);
  //   }))
  // }

  // idQuered = {}
  // async fillAllFeatureNameItems() {

  //   await this.getAllSeparatorName();

  //   this.mainData.map(async (item, index) => {
  //     var namesList = await lastValueFrom(await this.apiConection.getFeatureNameFromGS2(item as { layerId: string, pk_name: string, pk_value: number }, this.idQuered[item.layerId]))
  //     // var namesList = await lastValueFrom(await this.apiConection.getFeatureNameFromGS2(item as { layerId: string, pk_name: string, pk_value: number }))
  //     if (namesList.values.length === 0) item.nameFeature = 'Sem informação';
  //     else if (namesList.values.length === 1) item.nameFeature = namesList.values[0]?.toString();
  //     else item.nameFeature = namesList.values.join(namesList.sep);

  //     if (index + 1 === this.mainData.length) this.isLoading = false;
  //   });
  // }

  sorterImoveis(a: mappingResultObject, b: mappingResultObject) {
    var aa = a.nameFeature?.split(' - ')[1]
    var bb = b.nameFeature?.split(' - ')[1]
    if (aa < bb) {
      return -1;
    }
    if (aa > bb) {
      return 1;
    }
    return 0;
  }

  getItemsFromLayerName(layerName: string) {
    var list = this.mainData.filter(e => e.layerName === layerName);
    if (layerName === 'Imóveis') list = list.sort(this.sorterImoveis);
    else list = list.sort();
    return list;
  }

  ngAfterViewInit(): void {
    this.menuTrigger?.openMenu();
    this.cdref.detectChanges();
  }

  fitBigFeature(feature: Feature): void {
    var featureExtent = feature.getGeometry().getExtent();
    var viewExtent = this.geoService.map.getView().calculateExtent();
    var deltaXFeature = featureExtent[0] - featureExtent[2];
    var deltaYFeature = featureExtent[1] - featureExtent[4];
    var deltaXView = viewExtent[0] - viewExtent[2];
    var deltaYView = viewExtent[1] - viewExtent[4];
    if (Math.abs(deltaXFeature) > Math.abs(deltaXView) || Math.abs(deltaYFeature) > Math.abs(deltaYView)) {
      this.geoService.map.getView().fit(featureExtent, { padding: Array(4).fill(150), duration: 500 });
    }
  }


  featureSelected(item: mappingResultObject) {
    // this.fitBigFeature(feature);
    // var p = feature.getProperties();
    // this.geoService.closeModalMenuFeature();
    this.geoService.openGeneralFeatureInfo(item);
  }


  isExpandable(layerName: string) {
    var list = this.getItemsFromLayerName(layerName);
    if (list.length > 1) return true;
    else return false;
  };

  closeMyMenu() {
    // this.menuTrigger?.closeMenu();
    this.geoService.clearHighligthAllFeature('higthlihtOptionToInfo');

    this.geoService.closeMenuFeatures();
  }

  ngOnDestroy() {

    this.closeMyMenu();
  }


  highligthFeature(item: mappingResultObject) {
    if (item.geomFeature) this.geoService.highligthFeature(item.geomFeature, 'higthlihtOptionToInfo');
  }

  clearHighligthFeature(item: mappingResultObject) {
    if (item.geomFeature) this.geoService.clearHighligthFeature(item.geomFeature, 'higthlihtOptionToInfo');
  }

}
