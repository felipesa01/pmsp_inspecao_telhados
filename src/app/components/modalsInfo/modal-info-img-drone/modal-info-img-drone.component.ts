import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import TileLayer from 'ol/layer/Tile';
import { TileWMS } from 'ol/source';
import { lastValueFrom } from 'rxjs';
import { ApisConectionService, dataToDialogInfoSearch, objGeneralToSpecific } from 'src/app/services/apis-conection.service';
import { GeoService } from 'src/app/services/geo.service';
import { LayersManagementService, layerCatalogItem } from 'src/app/services/layers-management.service';
import { listItem } from '../../main-container/sidebar/main-layer-list/main-layer-list.component';

@Component({
  selector: 'app-modal-info-img-drone',
  templateUrl: './modal-info-img-drone.component.html',
  styleUrls: ['./modal-info-img-drone.component.css']
})
export class ModalInfoImgDroneComponent {

  dataFromGeneral: objGeneralToSpecific;

  constructor(private geoservice: GeoService, private layersMng: LayersManagementService, private apiConection: ApisConectionService, @Inject(MAT_DIALOG_DATA) public dataObj: dataToDialogInfoSearch) { }

  async openImg(modeLayer: boolean = true) {

    // console.log('aqui: ', this.dataFromGeneral['data']);
    var itemCatalog = await lastValueFrom(this.apiConection.getLayerInfo(Number(this.dataFromGeneral.dataOrForm['id_catalog']))) as layerCatalogItem;

    var layer = this.layersMng.createVectorTile(itemCatalog, false) as TileLayer<TileWMS>
    layer.setProperties({'imgThumb': './assets/images/tileThumbs/drone-gray-100.png'})

    if (modeLayer) this.geoservice.addLayerToMapAndSidebar({ id: layer.get('id'), layer: layer, name: layer.get('name'), order: 0, legendOn: false, cat: 'img_drone' } as listItem)
    else {
      this.geoservice.droneTiles.push(layer);
      this.geoservice.droneTileAdded.push(true);
      this.geoservice.setTileSource(layer);
    }
  }

  setDataFromGeneral(e: objGeneralToSpecific) {
    this.dataFromGeneral = e;
  }

}
