import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { ChartConfiguration, ChartData, ChartType, ChartEvent, PointElement, ChartDataset, ChartTypeRegistry, BubbleDataPoint, ScatterDataPoint } from 'chart.js';
import * as moment from 'moment';
// import * as fns from "date-fns";
import { Moment } from 'moment-timezone';
import { BaseChartDirective } from 'ng2-charts';
import { lastValueFrom, take } from 'rxjs';
import { ApisConectionService } from 'src/app/services/apis-conection.service';
import { GeoService } from 'src/app/services/geo.service';
import 'chartjs-adapter-moment';
import 'moment/min/locales';
import LayerGroup from 'ol/layer/Group';
import TileLayer from 'ol/layer/Tile';
import BaseLayer from 'ol/layer/Base';
import { includesReverseAxis } from 'cesium';

moment.locale('pt-br');

@Component({
  selector: 'app-timeline-toolbar',
  templateUrl: './timeline-toolbar.component.html',
  styleUrls: ['./timeline-toolbar.component.css'],
})
export class TimelineToolbarComponent implements OnInit {

  dateType = [
    {
      name: 'Anual',
      value: 'y',
      format: 'YYYY',
      func: (e: Moment) => e.year(),
      // func2: (e: Date) => fns.getYear(e),
      // startFunc: (e): Date => fns.startOfYear(e),
      // diffFunction: (dateLeft: string | number | Date, dateRight: string | number | Date) => fns.differenceInCalendarYears(dateLeft, dateRight),
      // key: 'years'
    },
    {
      name: 'Mensal',
      value: 'M',
      format: 'MMMM [de] YYYY',
      func: (e: Moment) => e.month(),
      // func2: (e: Date) => fns.getMonth(e),
      // startFunc: (e): Date => fns.startOfMonth(e),
      // diffFunction: (dateLeft: string | number | Date, dateRight: string | number | Date) => fns.differenceInCalendarMonths(dateLeft, dateRight),
      // key: 'months'
    },
    {
      name: 'Semanal',
      value: 'w',
      format: 'D/MM/YYYY',
      func: (e: Moment) => e.week(),
      // func2: (e: Date) => fns.getWeek(e),
      // startFunc: (e): Date => fns.startOfWeek(e),
      // diffFunction: (dateLeft: string | number | Date, dateRight: string | number | Date) => fns.differenceInCalendarWeeks(dateLeft, dateRight),
      // key: 'weeks'
    },
    {
      name: 'Diário',
      value: 'd',
      format: 'D/MM/YYYY',
      func: (e: Moment) => e.day(),
      // func2: (e: Date) => fns.getDay(e),
      // startFunc: (e): Date => fns.startOfDay(e),
      // diffFunction: (dateLeft: string | number | Date, dateRight: string | number | Date) => fns.differenceInCalendarDays(dateLeft, dateRight),
      // key: 'days'
    },
  ];

  layerSource: string;
  @Input() layerId: number;
  layer: TileLayer<any> | LayerGroup | BaseLayer
  dateAttribures: {};

  selectedAttr = '';
  selectedPeriodo: moment.unitOfTime.StartOf | moment.unitOfTime.Base | '' = '';

  source;

  min = moment();
  max = moment();

  // min: Date;
  // max: Date;
  items: { x: number, y: number }[] = [];
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;
  on = false;
  cumulative = false;
  totalFeatures: number;

  constructor(public geoservice: GeoService, private apiConection: ApisConectionService) {

  }
  ngOnInit(): void {
    // console.log(this.layerId)
    this.layer = this.geoservice.map.getLayers().getArray().filter(e => e.get('id') == this.layerId)[0] as TileLayer<any> | LayerGroup;
    this.layerSource = this.layer.get('fonteGS_back') ? this.layer.get('fonteGS_back') : this.layer.get('fonteGS_front')
    this.getAttributes(this.layerSource);
  }

  async getAttributes(layerSource: string) {
    var attr = await lastValueFrom(this.apiConection.getAttributesTypeGS(layerSource));
    var apelidos = await lastValueFrom(this.apiConection.getColumnsApelidoFromPG(this.layerId.toString()))
    // console.log(apelidos);

    var attribures = attr.featureTypes[0].properties.filter(e => e.localType == 'date').map(e => e.name);
    // console.log(this.dateAttribures);
    this.dateAttribures = Object.keys(apelidos)
      .filter(key => attribures.includes(key))
      .reduce((obj, key) => {
        obj[key] = apelidos[key];
        return obj;
      }, {});

    // console.log(this.dateAttribures);
  }

  slices: Date[][] = [];
  onChange() {

    if (this.selectedAttr != '' && this.selectedPeriodo != '') {
      this.apiConection.dateAttributeToTimeline(this.layerSource, this.selectedAttr).pipe(take(1)).subscribe(e => {
        this.source = e;
        this.max = e.max.clone().startOf(this.selectedPeriodo as moment.unitOfTime.StartOf);
        this.min = e.min.clone().startOf(this.selectedPeriodo as moment.unitOfTime.StartOf);

        // var type = this.dateType.filter(e => e.value == this.selectedPeriodo)[0];
        // this.max = type.startFunc(e.max);
        // this.min = type.startFunc(e.min);


        var duration = moment.duration(this.max.diff(this.min))
        var total = Math.ceil(duration.as(this.selectedPeriodo as moment.unitOfTime.Base)) + 1;

        // var duration = fns.interval(this.min, this.max)
        // var total = Math.ceil(type.diffFunction(this.max, this.min)) + 1;

        var before = this.min;
        this.slices = []
        this.datasets[0].pointBackgroundColor = '#ddd';
        for (var i = 1; i <= total; i++) {

          // var durationFns = {}
          // durationFns[type.key] = 1
          // this.slices.push([before, fns.sub(fns.add(before, durationFns), {'seconds': 1})])
          // before = fns.add(before, durationFns)


          this.slices.push([before.clone().toDate(), before.clone().add(1, this.selectedPeriodo as moment.unitOfTime.Base).subtract(1, 'millisecond').toDate()]);
          before.add(1, this.selectedPeriodo as moment.unitOfTime.Base);
        }
        this.getData(this.slices);
      })
    }
    else {
      this.on = false
    }

  }

  unitsMapper = {
    'd': 'day',
    'w': 'month',
    'M': 'month',
    'y': 'year'
  }

  public scatterChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'time',
        time: {
          unit: this.unitsMapper[this.selectedPeriodo]
        },
        // ticks: { align: 'inner' }
      },
      y: { display: false }
    },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false }
    },

  };

  public scatterChartType: ChartType = 'scatter';
  datasets: ChartData<'scatter'>['datasets'] = [{
    data: this.items,
    label: 'Series A',
    pointRadius: 7,
    pointStyle: 'circle',
    pointBackgroundColor: '#ddd',
    pointHoverRadius: 10,
    // pointBackgroundColor: (context) => {
    //   var index = context.dataIndex;
    //   var value = context.dataset.data[index];
    //   return context.parsed.x == this.selectedPoint[1].valueOf() ? 'red' : '#ddd'}
  }]

  labels: ChartData<'scatter'>['labels'] = Array<any>();

  selectedPoint: moment.Moment[] = [];

  getData(array: Date[][]) {
    this.labels = array.map(e => moment(e[0]).format('YYYY-MM-DD'));
    this.datasets[0].data = array.map(e => { return { x: e[0].valueOf(), y: 0 } });
    this.selectedPoint = array[0].map(e => moment(e));
    this.changeSourceLayer()
    this.setStyleOfPoints([{ index: 0 }])
    this.on = true;
  }

  getString([a, b]: [a: moment.Moment, a: moment.Moment]) {
    var type = this.dateType.filter(e => e.value == this.selectedPeriodo)[0];
    if (this.selectedPeriodo == 'w') {
      if (this.cumulative) return `Até ${b.format(type.format)}`
      else return `${a.format(type.format)} a ${b.format(type.format)}`
    }
    else {
      if (this.cumulative) return `Até ${a.format(type.format)}`
      return a.format(type.format)
    };
  }

  refresh_chart() {
    setTimeout(() => {
      if (this.chart && this.chart.chart && this.chart.chart.config) {
        this.chart.chart.config.data.labels = this.labels;
        this.chart.chart.config.options.scales['x']['time'].unit = this.unitsMapper[this.selectedPeriodo];
        this.chart.chart.config.data.datasets = this.datasets;
        this.chart.chart.update();
      }
    });
  }

  indexOfArray(array: Date[][], item: Date[]) {
    for (var i = 0; i < array.length; i++) {
      // This if statement depends on the format of your array
      if (array[i][0].valueOf() == item[0].valueOf() && array[i][1].valueOf() == item[1].valueOf()) {
        return i;   // Found it
      }
    }
    return -1;   // Not found
  }

  setScartterPoint(mode: 1 | -1) {
    var index = this.indexOfArray(this.slices, this.selectedPoint.map(e => e.toDate()));

    if (index != -1) {
      index = index + mode;
      this.selectedPoint = this.slices[index].map(e => moment(e));
      this.setStyleOfPoints([{ index: index }]);

      this.changeSourceLayer();
      this.setStyleOfPoints()
    }
  }

  async changeSourceLayer() {
    if (!this.cumulative) {
      var cqlFilter = `"${this.selectedAttr}">=dateParse('yyyy-MM-dd','${this.selectedPoint[0].format('YYYY-MM-DD')}') AND "${this.selectedAttr}"<=dateParse('yyyy-MM-dd','${this.selectedPoint[1].format('YYYY-MM-DD')}')`
    }
    else {
      var cqlFilter = `"${this.selectedAttr}"<=dateParse('yyyy-MM-dd','${this.selectedPoint[1].format('YYYY-MM-DD')}')`
    }
    if (this.layer instanceof TileLayer) {
      this.layer.getSource().updateParams({ 'cql_filter': cqlFilter })
    }
    else console.log('atenção aqui!')
    this.setStyleOfPoints()

    this.totalFeatures = await lastValueFrom(this.apiConection.featuresCountGS(this.layerSource, cqlFilter));
  }


  setStyleOfPoints(active?: { datasetIndex?: number, element?: PointElement, index: number }[]) {
    var itemIndex: number
    if (!active) {
      itemIndex = this.indexOfArray(this.slices, this.selectedPoint.map(e => e.toDate()))
    }
    else {
      itemIndex = active[active.length - 1]?.index
    }
  
    var propiertsObj = {
      bgSimpleColor: '#adb5bd',
      bgSelectedColor: '#fa6400',
      borderSimpleColor: '#fff',
      borderSelectdColor: '#000',
      borderSimpleWidth: 1,
      borderSelectedWidth: 2
    }
    if (!this.cumulative) {
      this.datasets[0].pointBackgroundColor = this.datasets[0].data.map((v, i) => i == itemIndex ? propiertsObj.bgSelectedColor : propiertsObj.bgSimpleColor);
      this.datasets[0].pointBorderColor = this.datasets[0].data.map((v, i) => i == itemIndex ? propiertsObj.borderSelectdColor : propiertsObj.borderSimpleColor);
      this.datasets[0].pointBorderWidth = this.datasets[0].data.map((v, i) => i == itemIndex ? propiertsObj.borderSelectedWidth : propiertsObj.borderSimpleWidth);
    }
    else {
      this.datasets[0].pointBackgroundColor = this.datasets[0].data.map((v, i) => i <= itemIndex ? propiertsObj.bgSelectedColor : propiertsObj.bgSimpleColor);
      this.datasets[0].pointBorderColor = this.datasets[0].data.map((v, i) => i <= itemIndex ? propiertsObj.borderSelectdColor : propiertsObj.borderSimpleColor);
      this.datasets[0].pointBorderWidth = this.datasets[0].data.map((v, i) => i <= itemIndex ? propiertsObj.borderSelectedWidth : propiertsObj.borderSimpleWidth);
    }

    this.refresh_chart();
  }

  disableButton(mode: 1 | -1) {
    if (mode == 1 && this.indexOfArray(this.slices, this.selectedPoint.map(e => e.toDate())) == this.slices.length - 1) return true
    if (mode == -1 && this.indexOfArray(this.slices, this.selectedPoint.map(e => e.toDate())) == 0) return true
    return false
  }


  // events
  public chartClicked({ event, active }: { event: ChartEvent; active: { datasetIndex: number, element: PointElement, index: number }[]; }): void {

    if (active.length > 0) {
      this.selectedPoint = this.slices.filter((e, i) => i == active[active.length - 1]?.index)[0].map(e => moment(e));
      this.changeSourceLayer()
      this.setStyleOfPoints(active);
    }
  }

}
