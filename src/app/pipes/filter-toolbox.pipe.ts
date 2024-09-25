import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterToolbox'
})
export class FilterToolboxPipe implements PipeTransform {

  transform(items: any[], filter: any): any {
    if (!items || !filter) {
      return items;
    }
    // filter items array, items which match and return true will be
    // kept, false will be filtered out
    if (filter instanceof Object) {
      var keys = Object.keys(filter);
    }

    var new_items = [];
    keys.forEach((key) => {
      items.forEach((item) => {
        if (item[key] === filter[key]) {
          new_items.push(item);
        }
      })
    })
    return new_items;
  }

}
