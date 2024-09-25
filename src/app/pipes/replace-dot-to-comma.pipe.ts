import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'replaceDotToComma'
})
export class ReplaceDotToCommaPipe implements PipeTransform {

  transform(value: unknown, ...args: unknown[]): unknown {
    if (value === ',') return '.';
  }

}
