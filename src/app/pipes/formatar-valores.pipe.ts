import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatarValores'
})
export class FormatarValoresPipe implements PipeTransform {

  transform(value: string, arg?: { fillTerm?: string, limit?: number }): string {
    if (!arg) {
      if (!value || value.length === 0 || value === '') return '-';
      else return value;
    }
    else {
      if (!value || value.length === 0 || value === '') {
        return arg.fillTerm
      }
      else {
        if (arg.limit && value.length > arg.limit) {
          return value.slice(0, arg.limit).trim() + '...'
        }
        else return value
      };

    }
  }


}
