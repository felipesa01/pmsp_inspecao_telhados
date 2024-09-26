import { AfterViewInit, Component, ComponentFactoryResolver, Inject, OnInit, ViewContainerRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { GeoService } from 'src/app/services/geo.service';
import { DOCUMENT } from '@angular/common';
import { AuthService } from 'src/app/services/auth.service';
import { ActivatedRoute, Router, RoutesRecognized } from '@angular/router';
import { ModalGoToCoordsComponent } from './toolbox/modal-go-to-coords/modal-go-to-coords.component';
import { StreetViewWindowsComponent } from './street-view-windows/street-view-windows.component';

@Component({
	selector: 'app-map',
	templateUrl: './map.component.html',
	styleUrls: ['./map.component.css'],
})
export class MapComponent implements AfterViewInit, OnInit {

	showModalFilter: boolean = false;
	idToModalFilter: string;
	idToModalTimeLine: string | null;
	elem;
	ctrlSwipeShowed = true;

	timelineShowed: { layerId: number, on: boolean }

	model: { grant_type: string, username: string, password: string } = { grant_type: 'password', username: '', password: '' };

	private readonly controlsStateSubscription: Subscription;
	loaderServiceSub: Subscription;
	isLoading: boolean;

	constructor(
		public geoService: GeoService,
		@Inject(DOCUMENT) private document: any, private authService: AuthService, private router: Router, private route: ActivatedRoute, private viewContainerRef: ViewContainerRef) {

		this.geoService.ctrlSwipeShowed.subscribe((e) => {
			this.ctrlSwipeShowed = e;
		});

		this.geoService.timelineIsOpen.subscribe(e => {
			this.timelineShowed = e
		})
	}

	public windowReference: any;
	ngAfterViewInit(): void {
		this.geoService.updateView();
		this.geoService.setTileSource();
		this.geoService.updateSize();
	}

	ngOnInit() {
		this.elem = document.documentElement;

		// Rastrear a rota atual para atualização da view do mapa
		// https://stackoverflow.com/questions/42947133/parent-components-gets-empty-params-from-activatedroute
		this.router.events.subscribe(val => {
			if (val instanceof RoutesRecognized) {
				//  colocar aqui a ação de aproximar o mapa para a feição definida
				console.log(val.state.root.firstChild.params);
				this.zoomToThere(val.state.root.firstChild.params['layerid']);
			}
		});
	}

	zoomToThere(idLayer) {
		this.geoService.updateView(idLayer);
	}


	isFulled: boolean = false;
	toggleFull() {
		if (!this.isFulled) {
			this.openFullscreen();
			// this.geoService.sidebarOpened.next(false);
		}
		else {
			this.closeFullscreen();
			// this.geoService.sidebarOpened.next(true);
		};
	}

	openFullscreen() {
		this.isFulled = true;
		if (this.elem.requestFullscreen) {
			this.elem.requestFullscreen();
		} else if (this.elem.mozRequestFullScreen) {
			/* Firefox */
			this.elem.mozRequestFullScreen();
		} else if (this.elem.webkitRequestFullscreen) {
			/* Chrome, Safari and Opera */
			this.elem.webkitRequestFullscreen();
		} else if (this.elem.msRequestFullscreen) {
			/* IE/Edge */
			this.elem.msRequestFullscreen();
		}
	}

	/* Close fullscreen */
	closeFullscreen() {
		this.isFulled = false;
		if (this.document.exitFullscreen) {
			this.document.exitFullscreen();
		} else if (this.document.mozCancelFullScreen) {
			/* Firefox */
			this.document.mozCancelFullScreen();
		} else if (this.document.webkitExitFullscreen) {
			/* Chrome, Safari and Opera */
			this.document.webkitExitFullscreen();
		} else if (this.document.msExitFullscreen) {
			/* IE/Edge */
			this.document.msExitFullscreen();
		}
	}

	refreshMap() {

		this.geoService.refreshMap();

		// this.router.navigate(['setview', Math.round(Math.random() * (18 - 10) + 10), Math.round(Math.random() * (18 - 10) + 10)]);

		// console.log(this.route.snapshot)

		// this.geoService.changeStreetViewWindow()

		// setTimeout(() => {
		// 	//create the component dynamically
		// 	const comp = this.viewContainerRef.createComponent(StreetViewWindowsComponent);

		// 	this.windowReference = window.open('', '_blank', 'toolbar=0, width=800, height=400, popup');

		// 	this.windowReference.document.body.appendChild(comp.location.nativeElement);

		// 	document.querySelectorAll('link, style').forEach((htmlElement) => { if (this.windowReference) { this.windowReference.document.head.appendChild(htmlElement.cloneNode(true)); } })
		// });
	}

	add3dModel() {

		this.geoService.set3dMap();

	}

	apply() {
		// this.authService.login(this.model).pipe(take(1)).subscribe(e => {
		// 	// console.log(e);
		// })

		// this.geoService.changeSwipeOrientation();
	}

}
