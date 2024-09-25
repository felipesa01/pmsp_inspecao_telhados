import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { MainContainerComponent } from './components/main-container/main-container.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatBadgeModule } from '@angular/material/badge';
import { OverlayModule } from '@angular/cdk/overlay';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTreeModule } from '@angular/material/tree';

import { DragDropModule } from '@angular/cdk/drag-drop';

import { SidebarComponent } from './components/main-container/sidebar/sidebar.component';
import { MapComponent } from './components/main-container/map/map.component';
import { MainLayerListComponent } from './components/main-container/sidebar/main-layer-list/main-layer-list.component';
import { LayerItemComponent } from './components/main-container/sidebar/main-layer-list/layer-item/layer-item.component';
import { LayersManagementService } from './services/layers-management.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDividerModule } from '@angular/material/divider';

import { GeoService } from './services/geo.service';

import { MAT_BOTTOM_SHEET_DEFAULT_OPTIONS } from '@angular/material/bottom-sheet';
import { MaterialModule } from './material.modules';
import { ModalTileLayerComponent } from './components/main-container/map/modal-tile-layer/modal-tile-layer.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { stylesMngService } from './services/styles-managment.service';
import { ResizableModule } from 'angular-resizable-element';
import { ToolboxComponent } from './components/main-container/map/toolbox/toolbox.component';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { PortalModule } from '@angular/cdk/portal';
import { LoaderInterceptor } from './interceptors/loader.interceptor';
import { ModalGeneralInfoComponent } from './components/modalsInfo/modal-general-info/modal-general-info.component';
import { NgTemplateNameDirective } from './directives/ng-template-name.directive';
import { FilterToolboxPipe } from './pipes/filter-toolbox.pipe';
import { OnClickComponent } from './components/on-click/on-click.component';
import { SearchToolbarComponent } from './components/main-container/map/search-toolbar/search-toolbar.component';
import { ToastContainerDirective, ToastrModule } from 'ngx-toastr';
import { FormatarValoresPipe } from './pipes/formatar-valores.pipe';
import { ModalResumeLayerComponent } from './components/modal-resume-layer/modal-resume-layer.component';
import { ModalGoToCoordsComponent } from './components/main-container/map/toolbox/modal-go-to-coords/modal-go-to-coords.component';
import { OnlyNumberDirective } from './directives/only-number.directive';
import { ReplaceDotToCommaPipe } from './pipes/replace-dot-to-comma.pipe';
import { ModalGenericHTMLComponent } from './components/modal-generic-html/modal-generic-html.component';
import { ModalInfoImgDroneComponent } from './components/modalsInfo/modal-info-img-drone/modal-info-img-drone.component';
import { DroneTilesListComponent } from './components/drone-tiles-list/drone-tiles-list.component';
import { MenuOnClickComponent } from './components/on-click/menu-on-click/menu-on-click.component';
import { SecLayerListComponent } from './components/main-container/sidebar/sec-layer-list/sec-layer-list.component';
import { ModalInfoImoveisComponent } from './components/modalsInfo/modal-info-imoveis/modal-info-imoveis.component';
import { ModalInfoSuaSmmapAutorizacoesComponent } from './components/modalsInfo/modal-info-sua-smmap-autorizacoes/modal-info-sua-smmap-autorizacoes.component';
import { AuxTypeAheadComponent } from './components/modalsInfo/aux-type-ahead/aux-type-ahead.component';
import { ModalSearchResultsComponent } from './components/modal-search-results/modal-search-results.component';

import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorIntl, MatPaginatorModule } from '@angular/material/paginator';
import { getPtPaginatorIntl } from './config/pt-paginator-intl';
import { TimelineToolbarComponent } from './components/main-container/map/timeline-toolbar/timeline-toolbar.component';
import { ChartHostComponent } from './components/chart-host/chart-host.component';
import { NgChartsModule } from 'ng2-charts';
import { ModalInfoFotoDroneComponent } from './components/modalsInfo/modal-info-foto-drone/modal-info-foto-drone.component';
import { NgxPrintModule } from 'ngx-print';
import { Route, RouterModule, Routes } from '@angular/router';
// import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

const appRoutes: Routes = [
    { path: '', component: MapComponent},
    { path: 'setview/:layerid/:featureid', component: MapComponent}
]

@NgModule(
    {
        declarations: [
            AppComponent,
            SidebarComponent,
            MapComponent,
            MainContainerComponent,
            MainLayerListComponent,
            LayerItemComponent,
            ModalTileLayerComponent,
            ToolboxComponent,
            ModalGeneralInfoComponent,
            NgTemplateNameDirective,
            FilterToolboxPipe,
            OnClickComponent,
            SearchToolbarComponent,
            FormatarValoresPipe,
            ModalResumeLayerComponent,
            ModalGoToCoordsComponent,
            OnlyNumberDirective,
            ReplaceDotToCommaPipe,
            ModalGenericHTMLComponent,
            ModalInfoImgDroneComponent,
            DroneTilesListComponent,
            MenuOnClickComponent,
            SecLayerListComponent,
            ModalInfoImoveisComponent,
            ModalInfoSuaSmmapAutorizacoesComponent,
            AuxTypeAheadComponent,
            ModalSearchResultsComponent,
            TimelineToolbarComponent,
            ChartHostComponent,
            ModalInfoFotoDroneComponent,
        ],
        bootstrap: [AppComponent],
        imports: [
            BrowserModule,
            NgbModule,
            BrowserAnimationsModule,
            MatSidenavModule,
            MatIconModule,
            MatListModule,
            MatCardModule,
            MatButtonModule,
            FormsModule,
            ReactiveFormsModule,
            MatDialogModule,
            MatDividerModule,
            DragDropModule,
            MatInputModule,
            MatFormFieldModule,
            MaterialModule,
            MatMenuModule,
            MatSortModule,
            MatPaginatorModule,
            MatTableModule,
            MatTooltipModule,
            MatSelectModule,
            MatCheckboxModule,
            MatBadgeModule,
            OverlayModule,
            MatTabsModule,
            MatSnackBarModule,
            ResizableModule,
            PortalModule,
            MatProgressSpinnerModule,
            MatTreeModule,
            ToastrModule.forRoot(),
            ToastContainerDirective,
            NgChartsModule,
            NgxPrintModule,
            RouterModule.forRoot(appRoutes)
        ],

        providers: [
            LayersManagementService,
            GeoService,
            { provide: MAT_BOTTOM_SHEET_DEFAULT_OPTIONS, useValue: { hasBackdrop: false } },
            stylesMngService,
            {
                provide: HTTP_INTERCEPTORS, useClass: LoaderInterceptor, multi: true
            }, {
                provide: MatDialogRef,
                useValue: {}
            },
            { provide: MAT_DIALOG_DATA, useValue: {} },
            { provide: MatPaginatorIntl, useValue: getPtPaginatorIntl() },
            provideHttpClient(withInterceptorsFromDi()),
        ]
    })
export class AppModule { }
