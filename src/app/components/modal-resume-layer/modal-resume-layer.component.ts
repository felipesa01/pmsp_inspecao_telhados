import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { lastValueFrom } from 'rxjs';
import { ApisConectionService } from 'src/app/services/apis-conection.service';
import { GeoService } from 'src/app/services/geo.service';
import { isNullOrUndefined } from 'util';

@Component({
  selector: 'app-modal-resume-layer',
  templateUrl: './modal-resume-layer.component.html',
  styleUrls: ['./modal-resume-layer.component.css']
})
export class ModalResumeLayerComponent {

  id: number;
  title: string;
  descricao: string;
  responsavel: string;
  ultAtualizacao: string;

  isLoading: boolean = true;

  constructor(private apiConection: ApisConectionService, @Inject(MAT_DIALOG_DATA) public data: number) {

    this.id = data;

    this.getData()
  }


  async getData() {
    var dataValues = await lastValueFrom(this.apiConection.getLayerInfo(this.id));

    this.title = dataValues['apelido'];
    this.descricao = dataValues['descricao'];
    this.responsavel = dataValues['responsavel'];

    this.isLoading = false;
  }
  

}
