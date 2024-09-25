import { Component, Inject, SecurityContext } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-modal-generic-html',
  templateUrl: './modal-generic-html.component.html',
  styleUrls: ['./modal-generic-html.component.css']
})
export class ModalGenericHTMLComponent {


  constructor(@Inject(MAT_DIALOG_DATA) public data_: {title: string, html: SafeHtml}, public dialogRef: MatDialogRef<ModalGenericHTMLComponent>) {

  }

  closeInfo() {
    this.dialogRef.close();
  }


}
