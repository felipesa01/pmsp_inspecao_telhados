import { Component, ElementRef, SecurityContext, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { NgxImageZoomModule } from 'ngx-image-zoom';
import { Collection, View } from 'ol';
import { defaults } from 'ol/control';
import { getCenter } from 'ol/extent';
import ImageLayer from 'ol/layer/Image';
import Map from 'ol/Map';
import { Projection } from 'ol/proj';
import Static from 'ol/source/ImageStatic';
import {
  DragRotate,
  DragRotateAndZoom,
  defaults as defaultInteractions,
} from 'ol/interaction.js';
import { objGeneralToSpecific } from 'src/app/services/apis-conection.service';
import { shiftKeyOnly } from 'ol/events/condition';

@Component({
  selector: 'app-modal-info-foto-drone',
  templateUrl: './modal-info-foto-drone.component.html',
  styleUrls: ['./modal-info-foto-drone.component.css']
})
export class ModalInfoFotoDroneComponent {

  dataFromGeneral;
  urlImage: string;

  map: Map


  constructor(private sanitized: DomSanitizer) {



  }

  setDataFromGeneral(e: objGeneralToSpecific) {
    this.dataFromGeneral = e;

    this.urlImage = `https://drive.google.com/thumbnail?id=${this.dataFromGeneral.dataOrForm['id_drive']}&sz=w1000`
    this.createMap();
    // console.log(this.urlImage);
  }

  getUrl() {
    return `https://drive.google.com/thumbnail?id=${this.dataFromGeneral.dataOrForm['id_drive']}&sz=w1000`
  }

  createMap() {
    const extent = [0, 0, 5472, 3648];
    const projection = new Projection({
      code: 'xkcd-image',
      units: 'pixels',
      extent: extent,
    });
    this.map = new Map({
      layers: [
        new ImageLayer({
          source: new Static({
            attributions: '© <a href="https://xkcd.com/license.html">xkcd</a>',
            url: this.urlImage,
            projection: projection,
            imageExtent: extent,
          }),
        }),
      ],
      view: new View({
        projection: projection,
        center: getCenter(extent),
        zoom: 2,
        maxZoom: 8,
      }),
      interactions: defaultInteractions().extend([new DragRotate({
        condition: shiftKeyOnly
      })]),
      controls: defaults({
        attribution: false,
        zoom: true,
      })
    })

    setTimeout(() => this.map.setTarget('map_zoneamento'), 1);
  }



}
