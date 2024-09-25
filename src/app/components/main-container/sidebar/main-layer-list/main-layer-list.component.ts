import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewContainerRef } from '@angular/core';
import { Subscription, take } from 'rxjs';
import { Directionality } from '@angular/cdk/bidi';
import { GeoService } from 'src/app/services/geo.service';
import { Layer } from 'ol/layer';
import LayerGroup from 'ol/layer/Group';
import { LayersManagementService } from 'src/app/services/layers-management.service';
import TileLayer from 'ol/layer/Tile';
import { DialogPosition, MatDialog, MatDialogConfig, MatDialogRef, MatDialogState } from '@angular/material/dialog';
import { DroneTilesListComponent } from 'src/app/components/drone-tiles-list/drone-tiles-list.component';
import { SecLayerListComponent } from '../sec-layer-list/sec-layer-list.component';


export interface listItem {
  id: number,
  order: number,
  name: string,
  cat: string,
  legendOn: boolean,
  layer: Layer<any>;
}

/**
 * Node for to-do item
 */
export class TreeItemNode {
  children: TreeItemNode[];
  item: listItem;
  code: string;
}

/** Flat to-do item node with expandable and level information */
export class TreeItemFlatNode {
  item: listItem;
  level: number;
  expandable: boolean;
  code: string;
  isCategoryName: boolean;
}


@Component({
  selector: 'app-main-layer-list',
  templateUrl: './main-layer-list.component.html',
  styleUrls: ['./main-layer-list.component.css']
})
export class MainLayerListComponent implements OnInit, OnDestroy {

  isOpen = false;
  isLoading: boolean = true;
  resizeSidebarSub: Subscription;
  position: DialogPosition

  constructor(public layersService: LayersManagementService, public viewContainerRef: ViewContainerRef, public dir: Directionality, public geoService: GeoService, protected changeDetectorRef: ChangeDetectorRef,  private dialog: MatDialog, public dialogRef: MatDialogRef<SecLayerListComponent>) {

    this.getMainLayers();

    this.geoService.layersIsLoading$.subscribe(e => this.isLoading = e);

    this.resizeSidebarSub = this.geoService.resizeSidebar.subscribe((e) => {

      this.position = { left: 10 + 'px', top: '8vh' }
      if (this.dialogRef instanceof MatDialogRef && this.dialogRef.getState() === MatDialogState.OPEN) {
        setTimeout(e => {
          this.dialogRef.updatePosition(this.position)
          // this.openDialog()
        }, 10)
      };
    })
  };

  sortLayersByCategory(a: TileLayer<any> | LayerGroup, b: TileLayer<any> | LayerGroup) {
    if (a.get('category') === 'REVISAR') return 1
    if (b.get('category') === 'REVISAR') return -1
    if (a.get('category') < b.get('category')) return -1
    if (a.get('category') > b.get('category')) return 1
    return 0
  }

  async getMainLayers() {
    var layerList = await this.layersService.getLayersFromPG();
    layerList = layerList.sort(this.sortLayersByCategory);

    layerList.slice().map((value, index) => {

      var value_turn;
      if (value instanceof LayerGroup) {
        value_turn = value.getLayers().getArray()[0];
      }
      else {
        value_turn = value;
      };

      this.geoService.layerAdded[value_turn.get('id')] = false;

      if (index % 2 == 10) {
        this.geoService.addLayerToMapAndSidebar(
          { id: value_turn.get('id'), order: index, name: value_turn.get('name'), legendOn: false, cat: value.get("category"), layer: value } as listItem);
      }
      else {
        this.geoService.secLayers.push({ id: value.get('id'), order: index, name: value.get("name"), legendOn: false, cat: value.get("category"), layer: value } as listItem);
        var cat = value.get("category");
        if (!this.geoService.categories.includes(cat)) {
          this.geoService.categories.push(cat);
          this.geoService.treeData.push({
            item: { id: cat, order: index, name: cat, cat: cat, legendOn: false, layer: undefined } as listItem,
            code: '0.' + this.geoService.categories.length
          })
        }
        var codeCategory = this.geoService.treeData.filter(e => e.item.id === cat)[0].code
        var valueEndTurn = this.geoService.treeData.filter(e => e.code.startsWith(codeCategory)).length;
        this.geoService.treeData.push({
          item: { id: value_turn.get('id'), order: index, name: value_turn.get('name'), cat: cat, legendOn: false, layer: value } as listItem,
          code: codeCategory + '.' + valueEndTurn
        })
      }
    })
    this.geoService.layersIsLoading$.next(false);
    // this.toggleSecList()
  }

  ngOnInit() { }


  openDialog() {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.disableClose = true;
    dialogConfig.hasBackdrop = false;
    dialogConfig.enterAnimationDuration = 50;
    dialogConfig.position = this.position;
    dialogConfig.panelClass = 'custom-mat-dialog-panel-sec-layer-list'

    this.dialogRef = this.dialog.open(SecLayerListComponent, dialogConfig);
    this.dialogRef.afterClosed().pipe(take(1)).subscribe((e) => {
      this.isOpen = false
    });
  }

  toggleSecList() {
    this.isOpen ? this.dialogRef.close() : this.openDialog();
    this.isOpen = !this.isOpen;
  }

  // Ajustar isso aqui!! Não existe mais o drag na secList
  drop(event: CdkDragDrop<listItem[], listItem[]>) {
    if (event.previousContainer === event.container) {
      if (event.container.id != 'secLayerList') {
        moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
        this.adjustZIndex(event.container.data);
      } else return;
    } 
  }

 
  // modifyLists(value: { secondary: boolean, id: number, command: string }) {
  //   var item = this.geoService.treeData.filter(e => e.item.id === value.id)[0]?.item;
  //   // Para quando a camada corresponde a uma imagem de drone (não foi adicionada na TreeList, apenas na mainList)
  //   if (!item) {
  //     var item = this.geoService.mainLayers.filter(e => e.id == value.id)[0];
  //   }
  //   if (value.command === 'add') {
  //     this.geoService.addLayerToMapAndSidebar(item);
  //   }
  //   else {
  //     this.geoService.removeLayerFromMapAndSidebar(item);
  //   }
  // }

  adjustZIndex(array: listItem[]) {
    array.forEach((element) => {
      const indexToset = array.slice().reverse().indexOf(element);
      element.order = indexToset;
      element.layer.setZIndex(indexToset);
    })
  }

  // timeOutId;
  // intervalOutId;
  // showLoad: number | null;
  // timeLoad: number = 0;
  // layerPreview: boolean = false;
  // mouseenter(item) {

  //   this.showLoad = item.id;
  //   this.timeLoad = 0;
  //   this.intervalOutId = setInterval(() => {
  //     this.timeLoad = this.timeLoad + 10

  //     if (this.timeLoad === 1000) {
  //       this.geoService.map.addLayer(item.layer);
  //       this.geoService.map.getLayers().getArray().filter(e => e == item.layer)[0].setOpacity(0.7);
  //     }
  //   }, 10)
  // }

  // mouseleave(item) {
  //   // clearTimeout(this.timeOutId);
  //   clearInterval(this.intervalOutId);
  //   this.showLoad = null;

  //   var layerFromMap = this.geoService.map.getLayers().getArray().filter(e => e == item.layer)[0];
  //   // Caso ainda não tenha sido inserida
  //   if (layerFromMap?.getOpacity() != 1) {
  //     layerFromMap?.setOpacity(1);
  //     this.geoService.removeLayer(item.layer);
  //   }

  //   this.timeLoad = 0;
  // }

  ngOnDestroy(): void {
    this.resizeSidebarSub.unsubscribe;
  }

  openDroneTileList() {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.disableClose = false;
    dialogConfig.hasBackdrop = false;
    // dialogConfig.position = { top: '10%' };
    dialogConfig.data = true;
    dialogConfig.maxWidth = '100vw'
    this.dialog.open(DroneTilesListComponent, dialogConfig)
  }

  closeLegend(item: listItem) {
    this.geoService.closeLegend.next(item.id);
  }

}
