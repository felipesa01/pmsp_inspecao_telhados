import { AfterViewInit, ChangeDetectorRef, Component, Inject, Input, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatMenuTrigger } from '@angular/material/menu';
import { GeoService } from 'src/app/services/geo.service';
import { mappingResultObject } from 'src/app/services/layers-management.service';
import { mapRecursiveResult } from '../on-click.component';
import WKT from 'ol/format/WKT.js';


@Component({
  selector: 'app-menu-on-click',
  templateUrl: './menu-on-click.component.html',
  styleUrls: ['./menu-on-click.component.css']
})
export class MenuOnClickComponent implements AfterViewInit {

  @ViewChild('clickHoverMenuTrigger') clickHoverMenuTrigger: MatMenuTrigger;

  @Input() data: mapRecursiveResult[] = [];
  @Input() trigger = '';
  @Input() isRootNode = true;

  groupped: boolean;

  constructor(private geoService: GeoService, private cdref: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) private dataImported: mapRecursiveResult[]) {
    if (this.data.length == 0) this.data = this.dataImported;

    this.data.every((e) => this.isLayerParent(e)) ? this.groupped === false : this.groupped = true;
  }

  ngAfterViewInit(): void {
    setTimeout(() => { this.clickHoverMenuTrigger?.openMenu() })
    this.cdref.detectChanges();
  }


  isExpandable(node: mapRecursiveResult): boolean {
    return node.children.length > 0;
  }

  isLayerParent(node: mapRecursiveResult) {
      return (node.children.length === 1 && (node.children[0] as mapRecursiveResult).children.length === 0)
  }

  nodeName(node: mapRecursiveResult) {
    if (node.children.length > 0) return node.item;
    else return node.item['nameFeature'];
  }

  featureSelected(item: mappingResultObject) {
    this.geoService.openGeneralFeatureInfo(item);
  }

  highligthFeature(item: mappingResultObject) {
    if (item.geomFeature) this.geoService.highligthFeature(item.geomFeature, 'higthlihtOptionToInfo');
  }

  clearHighligthFeature(item: mappingResultObject) {
    if (item.geomFeature) this.geoService.clearHighligthFeature(item.geomFeature, 'higthlihtOptionToInfo');
  }
}
