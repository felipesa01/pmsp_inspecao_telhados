import { Component } from '@angular/core';
import { objGeneralToSpecific } from 'src/app/services/apis-conection.service';

@Component({
  selector: 'app-modal-info-sua-smmap-autorizacoes',
  templateUrl: './modal-info-sua-smmap-autorizacoes.component.html',
  styleUrls: ['./modal-info-sua-smmap-autorizacoes.component.css']
})
export class ModalInfoSuaSmmapAutorizacoesComponent {

  url: string;

  setDataFromGeneral(e: objGeneralToSpecific) {
    this.url = "https://producao.aprova.com.br/consulta/process/view/santanadeparnaibasp/" + e.dataOrForm['n_processo'] + "/" + e.dataOrForm['cod_verif'];
  }

  sendToAprova() { 
    window.open(this.url, "_blank");
  }

}
