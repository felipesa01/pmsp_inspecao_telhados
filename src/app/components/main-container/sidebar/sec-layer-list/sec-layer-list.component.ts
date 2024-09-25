import { Directionality } from '@angular/cdk/bidi';
import { FlatTreeControl } from '@angular/cdk/tree';
import { ChangeDetectorRef, Component, ViewContainerRef } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { GeoService } from 'src/app/services/geo.service';
import { LayersManagementService } from 'src/app/services/layers-management.service';
import { TreeItemFlatNode, TreeItemNode, listItem } from '../main-layer-list/main-layer-list.component';

@Component({
  selector: 'app-sec-layer-list',
  templateUrl: './sec-layer-list.component.html',
  styleUrls: ['./sec-layer-list.component.css']
})
export class SecLayerListComponent {

  // ***********************************************************************************************************************************
  flatNodeMap = new Map<TreeItemFlatNode, TreeItemNode>();
  nestedNodeMap = new Map<TreeItemNode, TreeItemFlatNode>();
  treeControl: FlatTreeControl<TreeItemFlatNode>;
  treeFlattener: MatTreeFlattener<TreeItemNode, TreeItemFlatNode>;
  dataSource: MatTreeFlatDataSource<TreeItemNode, TreeItemFlatNode>;
  treeData: { item: listItem, code: string }[] = [];
  getLevel = (node: TreeItemFlatNode) => node.level;
  isExpandable = (node: TreeItemFlatNode) => node.expandable;
  getChildren = (node: TreeItemNode): TreeItemNode[] => node.children;
  hasChild = (_: number, _nodeData: TreeItemFlatNode) => _nodeData.expandable;
  isCategoryName = (_: number, _nodeData: TreeItemFlatNode) => _nodeData.isCategoryName;
  // ***********************************************************************************************************************************

  isExpanded: boolean = false;
  layerPreview: boolean = false;


  constructor(public layersService: LayersManagementService, public viewContainerRef: ViewContainerRef, public dir: Directionality, public geoService: GeoService, protected changeDetectorRef: ChangeDetectorRef, private dialog: MatDialog, public dialogRef: MatDialogRef<SecLayerListComponent>) {

    // **************************************************************************************************************************
    this.treeFlattener = new MatTreeFlattener(this.transformer, this.getLevel, this.isExpandable, this.getChildren);
    this.treeControl = new FlatTreeControl<TreeItemFlatNode>(this.getLevel, this.isExpandable);
    this.dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);
    // **************************************************************************************************************************

    this.dataSource.data = this.buildFileTree(this.geoService.treeData, '0');
  }

  getNameOfLayer(node: TreeItemNode) {
    return node.item.layer?.get('name')
  }

  isAdded(node: TreeItemNode) {
    return this.geoService.mainLayers.filter(e => e.id === node.item.id)[0] ? true : false
  }

  addLayer(node: TreeItemNode) {
    this.geoService.addLayerToMapAndSidebar(node.item);
  }

  removeLayer(node: TreeItemNode) {
    this.geoService.removeLayerFromMapAndSidebar(node.item)
  }

  getLayerFromNode (node: TreeItemNode) {
    var item = this.geoService.treeData.filter(e => e.item.id === node.item.id)[0]?.item;
    // Para quando a camada corresponde a uma imagem de drone (não foi adicionada na TreeList, apenas na mainList)
    if (!item) {
      var item = this.geoService.mainLayers.filter(e => e.id == node.item.id)[0];
    }
    return item;
  }

  close() {
    this.dialogRef.close();
  }

  public _filter(filterText: string) {
    let filteredTreeData: {item: listItem; code: string;}[];
    if (filterText) {

      filteredTreeData = this.geoService.treeData.filter((d) => d.item.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(filterText.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase())
      );

      Object.assign([], filteredTreeData).forEach((ftd) => {
        let str = <string>ftd.code;
        while (str.lastIndexOf('.') > -1) {
          const index = str.lastIndexOf('.');
          str = str.substring(0, index);
          if (filteredTreeData.findIndex((t) => t.code === str) === -1) {
            const obj = this.geoService.treeData.find((d) => d.code === str);
            if (obj) {
              filteredTreeData.push(obj);
            }
          }
        }

       
        // if (filteredTreeData.length === 1) {
        //   this.geoService.treeData.filter(e => e.code.startsWith(filteredTreeData[0].code) && e.code.length > filteredTreeData[0].code.length).map(i => {
        //     filteredTreeData.push(i)
        //   })
        // }
      })
    } else {
      filteredTreeData = this.geoService.treeData;
    }
    // Retoque final (prencher quando a ca)
    filteredTreeData.filter(e => !e.item.layer).map(categoriaItem => {
      var itemsofCat = filteredTreeData.filter(e => e.item.cat === categoriaItem.item.name && e.item.layer);
      // Caso tenha sido encotrado apenas a cetegoria sem seus sub itens ou o termo buscado corresponda a uma categoria, são acrescentados todos o sub itens desta categoria.
      if (itemsofCat.length === 0 || categoriaItem.item.name.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().startsWith(filterText.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase())) {
        this.geoService.treeData.filter(e => e.item.cat === categoriaItem.item.name).map(i => {
          if (!filteredTreeData.includes(i))filteredTreeData.push(i)
        })
      }
    })
    this.dataSource.data = this.buildFileTree(filteredTreeData, '0');
  }

  buildFileTree(obj: any[], level: string): TreeItemNode[] {
    return obj
      .filter(
        (o) =>
          (<string>o.code).startsWith(level + '.') &&
          (o.code.match(/\./g) || []).length === (level.match(/\./g) || []).length + 1)

      .map((o) => {
        const node = new TreeItemNode();
        node.item = o.item;
        node.code = o.code;
        const children = obj.filter((so) =>
          (<string>so.code).startsWith(level + '.')
        );
        if (children && children.length > 0) {
          node.children = this.buildFileTree(children, o.code);
        }
        return node;
      });
  }

  transformer = (node: TreeItemNode, level: number) => {
    const existingNode = this.nestedNodeMap.get(node);
    const flatNode =
      existingNode && existingNode.item === node.item
        ? existingNode
        : new TreeItemFlatNode();
    flatNode.item = node.item;
    flatNode.level = level;
    flatNode.expandable = node.children && node.children.length > 0;
    flatNode.isCategoryName = typeof node.item.id === 'string';
    this.flatNodeMap.set(flatNode, node);
    this.nestedNodeMap.set(node, flatNode);
    return flatNode;
  };

  filterChanged(filterText: string) {
    this._filter(filterText);
    if (filterText) {
      this.treeControl.expandAll();
    } else {
      this.treeControl.collapseAll();
    }
  }

  toglleExpandAll() {
    this.isExpanded = !this.isExpanded;
    this.isExpanded ? this.treeControl.expandAll() : this.treeControl.collapseAll();
  }

  togllePrevisibility() {
    this.layerPreview = !this.layerPreview;
  }

  intervalOutId;
  showLoad: number | null;
  timeLoad: number = 0;
  mouseenter(node: TreeItemNode) {

    this.showLoad = node.item.id;
    this.timeLoad = 0;
    this.intervalOutId = setInterval(() => {
      this.timeLoad = this.timeLoad + 10

      if (this.timeLoad === 1000 && !this.isAdded(node)) {
        this.geoService.map.addLayer(node.item.layer);
        this.geoService.map.getLayers().getArray().filter(e => e == node.item.layer)[0].setOpacity(0.7);
      }
    }, 10)
  }

  mouseleave(node: TreeItemNode) {
    clearInterval(this.intervalOutId);
    this.showLoad = null;

    var layerFromMap = this.geoService.map.getLayers().getArray().filter(e => e == node.item.layer)[0];
    // Caso ainda não tenha sido inserida
    if (layerFromMap?.getOpacity() != 1) {
      layerFromMap?.setOpacity(1);
      this.geoService.removeLayer(node.item.layer);
    }

    this.timeLoad = 0;
  }

}
