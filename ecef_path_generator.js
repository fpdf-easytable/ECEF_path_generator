 /*********************************************************************
 * ecef_path_generator.js                                             *
 *                                                                    *
 * Version: 2.0                                                       *
 * Date:    28-01-2022                                                *
 * Author:  Dan Machado                                               *
 * Require  raphaeljs v2.2.1                                          *
 **********************************************************************/

function roundNumber(x, p){
	var d=2;
	if(typeof p==='number') {
		d=p;
	}	
	return (Math.round(x* Math.pow(10, d))/Math.pow(10,d)).toFixed(p);
}

//##################################################################

//to load a file
function readSingleFile(e) {
	var file = e.target.files[0];
	if(!file){
		return;
	}

	var reader = new FileReader();
	reader.readAsText(file, "UTF-8");
	reader.onload = function(e) {
		drawer.upload(e.target.result.toString());
	};
}

//##################################################################

function ReadCookie(){
	cookies={};
	var allcookies = document.cookie;
	var cookiearray = allcookies.split(';');
	
	for(var i=0; i<cookiearray.length; i++) {
		name=cookiearray[i].split('=')[0];
		cookies[name.trim()]=cookiearray[i].split('=')[1];
	}
	var lat;
	var lng;
	if(cookies.hasOwnProperty('latitude') && cookies.hasOwnProperty('longitude')){
		lat=Number(cookies.latitude);
		lng=Number(cookies.longitude);
	}
	if(!isNaN(lat) && !isNaN(lng)){
		document.getElementById("latitude").value=cookies.latitude;
		document.getElementById("longitude").value=cookies.longitude;
		return {'lat':lat,  'lng':lng};
	}
	return {'lat':53.2672, 'lng':-1.63};
}

//##################################################################

function distance2DPoints(x1, y1, x2, y2)
{
	return Math.sqrt(Math.pow(x1-x2, 2) + Math.pow(y1-y2, 2));
}

//####################################################################

var mkVect2D=(function(){
	var Vec2D={
		x:0,
		y:0,
		add:function(vect){
			this.x+=vect.x;
			this.y+=vect.y;
		},
		subs:function(vect){
			this.x-=vect.x;
			this.y-=vect.y;
		},
		multiply:function(t){
			this.x*=t;
			this.y*=t;
		},
		add2:function(x, y){
			this.x+=x;
			this.y+=y;
		},
		length:function(){
			return distance2DPoints(this.x, this.y, 0, 0);
		},
		clone:function(){
			return mkVect2D(this.x, this.y);
		},
		normalise:function(){
			this.multiply(1.0/this.length());
		},
		distance:function(other){
			if(typeof other === "object"){
				return distance2DPoints(this.x, this.y, other.x, other.y);
			}
			throw "parameter passed is not an object."
		},
		setPositionAt:function(x, y){
			this.x=x;
			this.y=y;
		},
		copyTo(other){
			other.x=this.x;
			other.y=this.y;
		},
		print:function(){
			return '('+this.x+', '+this.y+')';
		},
	};
	
	return function(x, y){
		var vect=Object.create(Vec2D);
		vect.setPositionAt(x, y);
		return vect;
	}
})();

//####################################################################
//####################################################################

Conversion={
	a : 1/60,
	b: 1/3600,
	kmToDDNorth:(function(){
		const dgK=110.574;
		const mnK=dgK/60;
		const scK=dgK/3600;
		return function(km){
			var d=km/dgK;
			var degs=Math.floor(d);
			var m=(km-degs*dgK);
			var mins=Math.floor(m/mnK);			
			var secs=m-mins*mnK;
			return degs+(mins*60+secs/scK)/3600;
		}
	})(),		
	kmToDDEast:(function(){
		var MPI=Math.PI/180.0;
		var dgK, mnK, scK, d, m;
		return function(lat, km){
			dgK=111.321*Math.cos(MPI*lat);
			mnK=dgK/60;
			scK=dgK/3600;
			d=km/dgK;
			var degs=Math.floor(d);
			m=(km-degs*dgK);
			var mins=Math.floor(m/mnK);			
			var secs=m-mins*mnK;
			return degs+(mins*60+secs/scK)/3600;
		}
	})(),
	toECEF:(function(){
		const a=6378137.0; //mts
		const b=6356752.3; //mts
		var m=(a*a);
		var n=b*b;
		const MPI=Math.PI/180;
		return function(lat, log, h){
			var q=Math.sqrt(m*Math.pow(Math.cos(MPI*lat),2)+n*Math.pow(Math.sin(MPI*lat),2));
			var c=m/q;
			var x=(c+h)*Math.cos(MPI*lat)*Math.cos(MPI*log);
			var y=(c+h)*Math.cos(MPI*lat)*Math.sin(MPI*log);
			var z=((n/m)*c+h)*Math.sin(MPI*lat);
			return roundNumber(x,3)+', '+roundNumber(y,3)+', '+roundNumber(z,3);
		};
	})(),	
};

//####################################################################
//####################################################################

(function(){
	const baseFactor=206;
	const initialZoom=14.25;
	const zoomDelta=0.25;

	Settings={	
		alt:30,
		currentZoom:initialZoom,

		setAltitude:function(centerAlt){
			this.alt=Number(centerAlt);
		},
		
		initialZoom:function(){
			return initialZoom;
		},

		zoomDelta:function(){
			return zoomDelta;
		},

		updateZoom:function(deltaZoom){
			currentZoom+=deltaZoom;
		},		
	};
	return Settings;
})();

var map = L.map('map',{      
		minZoom: 0,
		zoomSnap: 0,
		zoomDelta: 0.25,
		zoomControl:false,
});

//####################################################################

(function(){
	var container=document.getElementById('container');
	var speedPanel=document.getElementById('speed-panel');
	var diff=window.innerHeight-speedPanel.offsetHeight;
	container.style.height=document.body.clientHeight+'px';
	container.style.height=window.innerHeight+'px';
	document.getElementById('canvasContainer').style.height=diff+'px';
	document.getElementById('canvas').style.height=diff+'px';
	document.getElementById('map').style.height=diff+'px';
	document.getElementById('left_pannel').style.height=diff+'px';

	var canvasWidth=document.getElementById('canvas').clientWidth;
	var canvasHeight=diff;
	const baseFactor=206;
	const baseZoom=14.25;
	globalSettings={
		canvas:document.getElementById('canvas'),
		baseZ:baseZoom,
		grid:[],
		Height:canvasHeight,
		Width:canvasWidth,
		scaleFactor:baseFactor,
		getScaleFactor:function(){
			return this.scaleFactor
		},
		gridSettings:{stroke: "#2929a3",'stroke-width':0.2, opacity: 0.6},
		paper:Raphael("canvas", canvasWidth, canvasHeight),
		wMtPx:0.0,
		hMtPx:0.0,
		mkGrid:function(){
			if(this.grid.length>0){
				for(var i=0; i<this.grid.length; i++){
					this.grid[i].remove();
				}
				this.grid.length=0;
			}

			var widthM=map.distance(map.containerPointToLatLng(L.point(0, 0)), map.containerPointToLatLng(L.point(this.Width, 0)));
			this.wMtPx=widthM/this.Width;

			var heightM=map.distance(map.containerPointToLatLng(L.point(0, 0)), map.containerPointToLatLng(L.point(0, this.Height)));
			this.hMtPx=heightM/this.Height;
			
			var hh=1000/this.hMtPx;
			var hK=Math.floor(this.Height/hh);

			for(var i=0; i<hK; i++){
				this.grid.push(this.paper.path('M0,'+(i+1)*hh+'L'+this.Width+','+(i+1)*hh).attr(this.gridSettings));
			}

			var ww=1000/this.wMtPx;
			var wK=Math.floor(this.Width/ww);
			
			this.scaleFactor=Math.floor(ww);
			this.scFacInv=1.0/this.scaleFactor;
			
			for(var i=0; i<wK; i++){
				this.grid.push(this.paper.path('M'+(i+1)*ww+',0L'+(i+1)*ww+','+this.Height).attr(this.gridSettings));
			}
		},

		mtsToPxs:function(mts){
			return mts*0.001*this.scaleFactor;
		},

		kmsToPxs:function(kms){
			return kms*this.scaleFactor;
		},

		pixelsToKms:function(pxD){
			return pxD*this.scFacInv;
		},

		pixelsToMts:function(pxD){
			return this.pixelsToKms(pxD)*1000.0;
		},

		containerPointToLatLng:function(pxX, pxY){
			var mapCenter=map.getCenter();			
			var lat=mapCenter.lat+Conversion.kmToDDNorth((0.5*this.Height-pxY)*this.scFacInv);
			var lng=mapCenter.lng+Conversion.kmToDDEast(lat, (pxX-0.5*this.Width)*this.scFacInv);
			return {'lat':lat, 'lng':lng};
 		},

		containerCenter:function(){
			return mkVect2D(0.5*this.Width, 0.5*this.Height);
		},

		latLngToPixelCoordinates:function(latLng){
			var R=this.mtsToPxs(map.distance(latLng, map.getCenter()));

			var center=this.containerCenter();
			var pos=map.latLngToContainerPoint(latLng);

			var r=distance2DPoints(center.x, center.y, pos.x, pos.y);
			var factor=R/r;
			var x=factor*Math.abs(center.x-pos.x);
			var y=factor*Math.abs(center.y-pos.y);
			
			var pixelsCoordinates={x:(center.x+x), y:(center.y+y)};
			
			if(pos.x<=center.x){
				pixelsCoordinates.x=center.x-x;
			}

			if(pos.y<=center.y){
				pixelsCoordinates.y=center.y-y;
			}
			return pixelsCoordinates;
		},

		latLngToMtsCoordinates:function(latLng){
			var R=map.distance(latLng, map.getCenter());

			var center=this.containerCenter();

			var pos=map.latLngToContainerPoint(latLng);
			
			var r=distance2DPoints(center.x, center.y, pos.x, pos.y);
			var factor=R/r;
			
			var px=factor*(pos.x-center.x);
			var py=factor*(center.y-pos.y);
			
			return {x:px, y:py};
		},

		mtsCoordinatesToPxs:function(x, y){
			return mkVect2D(this.mtsToPxs(x)+0.5*this.Width, -1*this.mtsToPxs(y)+0.5*this.Height);
		},

		mtsCooPxs:function(x, y, cbk){
			cbk(this.mtsToPxs(x)+0.5*this.Width, -1*this.mtsToPxs(y)+0.5*this.Height);
		},

		mtsCooPxs2:function(x, y){
			return {transform: 't'+(this.mtsToPxs(x)+0.5*this.Width)+','+(-1*this.mtsToPxs(y)+0.5*this.Height)};
		},

		getPosition:function(cbk) {
			var lx=this.canvas.getBoundingClientRect().left;
			var ly=this.canvas.getBoundingClientRect().top;
			var rx=lx+this.Width;
			var ry=ly+this.Height;

			canvas.onmousedown=function(){
				document.onmouseup = closeDrawElement;
				document.onmousemove = elementDraw;
			};

			function elementDraw(e) {
				x=e.clientX;
				y=e.clientY;
				if(x>lx && x<rx && y>ly && y<ry){
					cbk(x-lx, y-ly);
				}
			}

			function closeDrawElement() {
				document.onmouseup = null;
				document.onmousemove = null;
			}
		},		
	};

	return globalSettings;
})();


//####################################################################
//####################################################################
//####################################################################

// add the OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>'
}).addTo(map);

L.control.scale({maxWidth:300}).addTo(map);

//map.setView([53.2672, -1.63], Settings.initialZoom());

//####################################################################
//####################################################################

var mkObjectEvt=(function(){
	var objectEvent={
		addHandler:function(evt,ck){
			this.handlers[evt]=this.handlers[evt] || [];
			this.handlers[evt].push(ck);
		},
		fire:function(evt){
			for(var i in this.handlers[evt]){
				this.handlers[evt][i].apply(null, Array.prototype.slice.call(arguments, 1));
			}
		},
	};

	return function(){
		var module=Object.create(objectEvent);
		module.handlers={};
	
		return module;
	}
})();

//####################################################################
//####################################################################

(function(){
	controlModule=mkObjectEvt();
	controlModule.playButton=document.getElementById('playButton');
	controlModule.pauseButton=document.getElementById('pauseButton');
	controlModule.recordButton=document.getElementById('recordButton');
	controlModule.recordingButton=document.getElementById('recordingButton');
	controlModule.deleteButton=document.getElementById('deletButton');
	controlModule.eraseButton=document.getElementById('eraseButton');
	controlModule.resetButton=document.getElementById('resetButton');

	controlModule.exportButton=document.getElementById('export');
	controlModule.exportDataButton=document.getElementById('exportData');


	controlModule.reset=function(){
		controlModule.pauseButton.style.display='none';
		controlModule.playButton.style.display='none';
		controlModule.recordingButton.style.display='none';
		this.recordButton.style.display='block';
		
		this.disableButtons(false);
	};

	controlModule.disableButtons=function(enable){
		controlModule.deleteButton.disabled = enable;
		controlModule.eraseButton.disabled = enable;
		controlModule.resetButton.disabled = enable;
		controlModule.exportButton.disabled=enable;
		controlModule.exportDataButton.disabled=enable;		
	};

	controlModule.addHandler('reset', function(){
		controlModule.reset();
	});

	controlModule.init=function(){
		document.getElementById('upload').addEventListener('change', readSingleFile);

		var zoomVal=globalSettings.baseZ;
		var zoomStep=0.25;
		controlModule.setZoom=function(zoomLevel){
			zoomVal=zoomStep*Math.floor(zoomLevel/zoomStep);
			if(zoomVal<12){
				zoomVal=globalSettings.baseZ;
			}
			map.setZoom(zoomVal);
		};
		document.getElementById('zoom_less').addEventListener('click', function(){
			if(zoomVal-0.25>=11){
				zoomVal-=0.25;
				map.setZoom(zoomVal);
			}
		});
		
		document.getElementById('zoom_more').addEventListener('click', function(){
			if(zoomVal+0.25<=17.0){
				zoomVal+=0.25;
				map.setZoom(zoomVal);
			}
		});

		var xT=0;
		controlModule.setSpeedTime=function(xt){
			if(xt>=0 && xt<4){
				xT=xt;
				controlModule.fire('timeFactor', xT); 
				document.getElementById('x_time').innerHTML='x'+Math.pow(2, xT);
			}
		};
		document.getElementById('time_speed_less').addEventListener('click', function(){
			if(xT>0){
				xT--;
				controlModule.setSpeedTime(xT);
			}
		});
		
		document.getElementById('time_speed_more').addEventListener('click', function(){
			if(xT<3){
				xT++;
				controlModule.setSpeedTime(xT);
			}
		});

		this.playButton.addEventListener('click', function () {
			controlModule.fire('play');
			controlModule.playButton.style.display='none';
			controlModule.pauseButton.style.display='block';
		});

		this.pauseButton.addEventListener('click', function () {
			controlModule.fire('pause');
			controlModule.pauseButton.style.display='none';
			controlModule.playButton.style.display='block';
		});

		this.recordButton.addEventListener('click', function () {			
			controlModule.recordButton.style.display='none';
			controlModule.recordingButton.style.display='block';
			controlModule.disableButtons(true);
			controlModule.fire('record');
		});

		this.deleteButton.addEventListener('click', function () {
			controlModule.fire('delete');
			controlModule.pauseButton.style.display='none';
			controlModule.playButton.style.display='none';
			controlModule.recordingButton.style.display='none';
			controlModule.recordButton.style.display='block';
			
			controlModule.eraseButton.disabled=false;
			
			controlModule.exportButton.disabled=true;
			controlModule.exportDataButton.disabled=true;
		});

		this.resetButton.addEventListener('click', function () {
			controlModule.fire('reset');
			controlModule.exportButton.disabled=true;
			controlModule.exportDataButton.disabled=true;
		});

		this.eraseButton.addEventListener('click', function () {
			controlModule.fire('erase');
		});

		this.addHandler('readyToPlay', function(){
			controlModule.pauseButton.style.display='none';
			controlModule.playButton.style.display='block';
		});

		this.addHandler('recordingFinished', function(){
			controlModule.recordingButton.style.display='none';
			controlModule.recordButton.style.display='none';
			controlModule.playButton.style.display='block';
			controlModule.disableButtons(false);
			controlModule.eraseButton.disabled=true;
		});
	};

	controlModule.altitude=10;

	controlModule.setAltitude=function(altitude){
		controlModule.altitude=Math.abs(altitude);
		controlModule.fire('altitudeChanged', controlModule.altitude);
	};

	controlModule.changeAltitude=function(code){ //z=90=down; x=88=up 
		var altStep=5;
		var maxAlt=1500;
		if(code==40){// down key
			if(controlModule.altitude>=altStep){
				controlModule.altitude-=altStep;
			}
			else{
				//this.altitude=0;
			}
		}
		else if(code==38){// up key
			if(controlModule.altitude<maxAlt-altStep){
				controlModule.altitude+=altStep;
			}
			else{
				controlModule.altitude=maxAlt;
			}
		}
		controlModule.fire('altitudeChanged', controlModule.altitude);
	};
	
	controlModule.exportButton.disabled=true;
	controlModule.exportDataButton.disabled=true;

	return controlModule;
})();

//####################################################################

var ZoomViewer = L.Control.extend({
	onAdd: function(){
		var container= L.DomUtil.create('div');
		var gauge = L.DomUtil.create('div');
		container.style.width = '200px';
		container.style.background = 'rgba(255,255,255,0.5)';
		container.style.tespeedTimeAlign = 'left';
		map.on('zoomstart zoom zoomend', function(ev){
			var zp=map.getZoom();
			gauge.innerHTML = 'Zoom level: ' + zp;
			controlModule.fire('scaleChange', zp-globalSettings.baseZ);
		})
		container.appendChild(gauge);
		return container;
	}
});

(new ZoomViewer).addTo(map);

//####################################################################
//####################################################################

var gadgetModule=(function(){
	var module=mkObjectEvt();

	module.distance=document.getElementById('distance');
	module.totalDistance=document.getElementById('Tdistance');
	module.speed=document.getElementById('speed');
	module.altitude=document.getElementById('altitude');
	module.elapsedTime=document.getElementById('elapsedtime');
	module.averageSpeed=document.getElementById('average_speed');

	module.active=false;
	module.reset=false;

	module.timer=(function(){
		var time=0, k, factor=1;
		module.resetR=function(){
			time=0;			
		};
		module.setFactor=function(x){
			factor=1;//Math.pow(2, x);
		}
		var rf=1.0/1000;
		return function(t){
			time+=factor*t;
			k=roundNumber(time*rf, 2);
			gadgetModule.elapsedTime.innerHTML=k;
		}
	})();

	module.changeTimeFactor=function(x){
		module.factor=x;
		module.setFactor(x);
	};

	module.resetTimer=function(){
		module.factor=1;
		module.active=false;
		module.resetR();
		module.elapsedTime.innerHTML='0.00';
	};
	
	module.startTimer=function(){
		module.active=true;
	};

	module.stopTimer=function(){
		module.active=false;
	};
	
	module.updateAlt=function(h){
		module.altitude.innerHTML=h;
	};
	
	module.updateSpeed=function(s){
		module.speed.innerHTML=s;
	};

	return module;	
})();

//####################################################################
//####################################################################
//####################################################################

var mkPOI=(function(){
	var objectPOI={
		geoPosition2D:null,// holds coordinates in meters from the center of the map
		POI:null,
		lat:'lat',
		lng:0.0,

		setAttr:function(attributes){
			this.POI.attr(attributes);
		},

		pointToLatLng:function(x, y){
			var latLng=globalSettings.containerPointToLatLng(x, y);
			this.lat=latLng.lat;
			this.lng=latLng.lng;
		},

		setPositionXY:function(x, y){
			this.POI.attr({transform: 't'+x+','+y});
			this.POI.toFront();
			this.pointToLatLng(x, y);
			this.geoPosition2D=globalSettings.latLngToMtsCoordinates({'lat':this.lat, 'lng':this.lng});
		},
		
		setLatLng:function(latLng){
			this.lat=latLng.lat;
			this.lng=latLng.lng;
			var pos=globalSettings.latLngToPixelCoordinates(latLng);
			this.POI.attr({transform: 't'+pos.x+','+pos.y});
			this.POI.toFront();
			this.geoPosition2D=globalSettings.latLngToMtsCoordinates({'lat':this.lat, 'lng':this.lng});
		},

		onZoom:function(){
			var pos=globalSettings.latLngToPixelCoordinates({'lat':this.lat, 'lng':this.lng});
			this.POI.attr({transform: 't'+pos.x+','+pos.y});
			this.POI.toFront();
		},

		getGeoX:function(){
			return this.geoPosition2D.x;
		},	

		getGeoY:function(){
			return this.geoPosition2D.y;
		},

		positionToECEF:function(altitude){
			Conversion.toECEF(this.lat, this.lng, altitude);
		},

		remove:function(){
			this.POI.remove();
		},

		getLatLng:function(){
			return {'lat':this.lat, 'lng':this.lng};
		},

		setColour:function(colour){
			this.POI.attr({stroke:'none', fill: colour});
		},
	};

	return function(x, y, attributes, radius){
		var module=Object.create(objectPOI);
		var poiR=2;
		var att={stroke:'none'};

		if(typeof attributes!=="undefined" && typeof attributes=='object'){
			att=attributes

			if(typeof radius!=="undefined"){
				poiR=radius;
			} 
		}

		module.POI=globalSettings.paper.circle(0, 0, poiR);
		module.POI.attr(att);
		module.POI.attr({transform: 't0,0'});
		module.setPositionXY(x, y);

		return module;
	}
})();

//####################################################################
//####################################################################

(function(){
	Trail={
		set:[],
		directions:[],
		//distances:[],

		looping:function(doSomething){
			for(var i=0; i<this.set.length; i++){
				doSomething(this.set[i]);
			}
		},

		onZoom:function(){
			this.looping(function(shape){
				shape.onZoom();
			});
			this.mover.attr(globalSettings.mtsCooPxs2(this.currentGeoPos.x, this.currentGeoPos.y));
			this.mover.toFront();
		},

		reset:function(){
			this.looping(function(shape){
				shape.remove();
			});
			this.set.length=0;
			this.directions.length=0;
			this.trailLength=0.0;
			this.segmentNum=0;
			this.distanceMt=0.0;
		},

		removeLast:function(){
			if(this.set.length>0){
				var i=this.set.length-1;
				if(i>0){
					this.trailLength-=this.segmentMtLength(i-1);
				}
				this.set[i].remove();
				this.set.pop();
			}
		},

		trailPOIcolour:"#ffb366",
		trailLength:0.0,
		mover:null,

		init:function(){
			this.mover=globalSettings.paper.circle(0, 0, 2);
			this.mover.attr({stroke:'none', fill: "blue"});
			this.mover.attr({transform: 't-100,-100'});
		},

		addPoint:function(x, y){
			this.set.push(mkPOI(x, y, {stroke:'none', fill: this.trailPOIcolour}));
			this.setUp();
		},

		addPointLatLng:function(latLng){
			this.set.push(mkPOI(0, 0, {stroke:'none', fill: this.trailPOIcolour}));
			var k=this.set.length-1;
			this.set[k].setLatLng(latLng);
			this.setUp();
		},
		
		setUp:function(){
			if(this.set.length>1){
				var i=this.set.length-1;
				this.directions.push(mkVect2D(this.getGeoX(i)-this.getGeoX(i-1), (this.getGeoY(i-1)-this.getGeoY(i))));
				this.trailLength+=this.segmentMtLength(i-1);
				i=this.directions.length-1;
				this.directions[i].normalise();
			}
		},

		getTrailLengthKm:function(){
			return this.trailLength*0.001;
		},

		segmentMtLength:function(idx){
			if(idx<this.set.length-1){
				return distance2DPoints(this.getGeoX(idx), this.getGeoY(idx), this.getGeoX(idx+1), this.getGeoY(idx+1));			
			}
			throw "something wrong in segmentMtLength";
		},

		getGeoX:function(index){
			return this.set[index].getGeoX();
		},

		getGeoY:function(index){
			return this.set[index].getGeoY();
		},

		getLastGeoX:function(){
			return this.set[this.set.length-1].getGeoX();
		},

		getLastGeoY:function(){
			return this.set[this.set.length-1].getGeoY();
		},

		currentGeoPos:mkVect2D(0, 0),

		moveToStart:function(){
			if(this.set.length>0){
				this.currentGeoPos.setPositionAt(this.getGeoX(0),this.getGeoY(0));
				this.mover.attr(globalSettings.mtsCooPxs2(this.currentGeoPos.x, this.currentGeoPos.y));
				this.mover.toFront();				
				this.segmentNum=0;
			}
		},

		moveToNext:function(time){
			this.currentGeoPos.add(this.deltaGeo);
			this.mover.animate(globalSettings.mtsCooPxs2(this.currentGeoPos.x, this.currentGeoPos.y), time, "linear");
			this.mover.toFront();
		},

		segmentNum:0,
		distanceMt:0,
		deltaGeo:mkVect2D(0, 0),

		getDelta:(function(){
			var msH=1/3600000;//conversion factor from k/h to k/ms
			var sH=1/3600; // conversion from k/h to k/sec
			var timeThreshold=300;
			var timeStep=200;
			var vkms, tms, dk, dm, a;
			return function(speed, speedTime){
				if(this.segmentNum+1==this.set.length){
					return {time:-1};
				}
				if(this.distanceMt<=0){			
					this.distanceMt=this.segmentMtLength(this.segmentNum);
				}

				vkms=speed*msH;
				tms=(0.001*this.distanceMt)/vkms;
				dk=0;
				a=false;

				if(tms>timeThreshold){
					tms=timeStep;
				}
				else{
					a=true;
					if(tms<3){
						console.log('jump to next vertix');
					}
				}

				dm=1000*vkms*tms;
				this.distanceMt-=dm;

				this.directions[this.segmentNum].copyTo(this.deltaGeo);
				this.deltaGeo.multiply(dm);
				this.deltaGeo.y*=-1;
				this.moveToNext(tms, speedTime);

				if(a){
					this.distanceMt=0;
					this.segmentNum++;
				}
				return {time:tms, distance:0.001*dm, geoX:this.currentGeoPos.x, geoY:this.currentGeoPos.y};
			};
		})(),

		exportData:function(){
			var dataResult=[];
			for(var i=0; i<this.set.length; i++){
				dataResult.push(this.set[i].getLatLng());
			}
			return dataResult;
		},

		setColours:function(trailColour, moverColour){
			if(moverColour!=''){
				this.mover.attr({stroke:'none', fill: moverColour});
			}
			
			if(trailColour!=''){
				this.trailPOIcolour=trailColour;
				for(var i=0; i<this.set.length; i++){
					this.set[i].setColour(this.trailPOIcolour);
				}
			}
		},
	};

	return Trail;

})();

//####################################################################
//####################################################################
//####################################################################
var popUpAPI;
var drawer={
	speedTime:2,
	status:0,
	offSetX:-1.63,
	offSetY:53.2672,
	altitude:10,
	init:function(){
		globalSettings.getPosition(function(x,y){
			drawer.getData(x,y);
		});

		Trail.init();
		
		controlModule.init();

		this.setSpeed(50);

		controlModule.addHandler('timeFactor', function(x){
			drawer['speedTime']=Math.pow(2, x);
			gadgetModule.changeTimeFactor(x);
		});

		controlModule.setSpeedTime(0);

		controlModule.addHandler('play', function(){
			drawer.play();
		});
		controlModule.addHandler('record', function(){
			drawer.record();
		});

		controlModule.addHandler('pause', function(){
			drawer.halt();
		});

		controlModule.addHandler('reset', function(){
			drawer.reset();
		});

		controlModule.addHandler('delete', function(){
			drawer.erase();
		});

		controlModule.addHandler('erase', function(){
			drawer.deleteLast();
		});

		controlModule.addHandler('scaleChange', function(x){			
			if(drawer.mapReady()){
				globalSettings.mkGrid();
				Trail.onZoom();
			}
		});
	
		controlModule.addHandler('altitudeChanged', function(alt){
			drawer['altitude']=alt;
			gadgetModule.updateAlt(alt);
		});

		controlModule.setAltitude(10);
	},
	mxG:10,
	speedData:[],
	altData:[],
	lastX:0.0,
	lastY:0.0,
	getData:function(x, y){
		if(this.status>0){
			return;
		}
		var d=0;
		if(this.head>0){
			var pxC=globalSettings.mtsCoordinatesToPxs(Trail.getGeoX(this.head-1), Trail.getGeoY(this.head-1));
			this.lastX=pxC.x;
			this.lastY=pxC.y;
			d=distance2DPoints(this.lastX, this.lastY, x, y);
		}

		if(d>this.mxG){
			var k=this.head-1;
			var r=Math.ceil(d/this.mxG);
			var f=1;
			if(x-this.lastX<0){
				f=-1;
			}
			var g=1;
			if(y-this.lastY<0){
				g=-1;
			}

			var tx=Math.abs(x-this.lastX)/r;
			var ty=Math.abs(y-this.lastY)/r;
			for(var j=1; j<r; j++){
				Trail.addPoint(this.lastX+j*tx*f, this.lastY+j*ty*g);
				this.head++;
			}

		}

		if(d>this.mxG || this.head==0){
			Trail.addPoint(x,y);
			this.head++;
			gadgetModule.totalDistance.innerHTML=roundNumber(Trail.getTrailLengthKm(), 2);
		}
	},

	deleteLast:function(){
		if(this.status>0 && this.head>1){
			return;
		}

		this.head--;
		Trail.removeLast();
		if(this.head>0){
			gadgetModule.totalDistance.innerHTML=roundNumber(Trail.getTrailLengthKm(), 2);
		}
		
	},
	counter:0,
	head:0,
	paused:false,
	halt:function(){
		this.paused=true;
	},
	isRunning:false,
	speed:1,

	play:function(){
		if(this.paused){
			gadgetModule.startTimer();
			this.paused=false;
			this.run();
		}

		if(this.isRunning){
			return;
		}

		this.counter=0;
		this.wkDistance=0;
		this.status=1;

		gadgetModule.resetTimer();
		gadgetModule.startTimer();

		Trail.moveToStart();

		if(this.speed>0){
			this.isRunning=true;
			this.counter++;
			this.run();
		}
	},

	wkDistance:0,

	run:(function(){
		var a=true;
		var idx=0;
		return function(){
			if(this.paused){
				return;
			}

			if(a){
				gadgetModule.speed.innerHTML=roundNumber(this.speedData[idx], 2);
				gadgetModule.updateAlt(this.altData[idx]);
				dt=Trail.getDelta(this.speedData[idx++], this.speedTime);

				a=(dt.time>=0) && (idx<this.speedData.length);

				if(dt.time>0){				
					setTimeout(function(){
						gadgetModule.timer(dt.time);
						this.run();	
					}.bind(this), dt.time/this.speedTime);
					this.wkDistance+=dt.distance;
					gadgetModule.distance.innerHTML=roundNumber(this.wkDistance,2);
				}
				else{
					this.run();
					a=true;
					idx=0;
				}
			}
			else{	
				controlModule.fire('readyToPlay');
				this.isRunning=false;
			}
		}
	}()),

	resetRecording:true,
	dataR:[],

	record:(function(){
		var a=true;
		return function(){
			if(this.head==0){				
				controlModule.fire('reset');
				return;
			}

			if(this.resetRecording){
				a=true;
				this.resetRecording=false;
				this.dataR.length=0;
				this.dataR.push([Trail.getGeoX(0), Trail.getGeoY(0)]);
				this.speedData.length=0;
				this.speedData.push(this.speed);
				this.altData.length=0;
				this.altData.push(this.altitude);
				Trail.moveToStart();
				this.status=1;
				gadgetModule.startTimer();
			}

			if(a){
				this.altData.push(this.altitude);
				this.speedData.push(this.speed);
				dt=Trail.getDelta(this.speed, this.speedTime);
				a=dt.time>=0;
				if(dt.time>0){
					this.dataR.push([dt.geoX, dt.geoY]);

					setTimeout(function(){
						gadgetModule.timer(dt.time);
						this.record();	
					}.bind(this), dt.time/this.speedTime);
	
					this.wkDistance+=dt.distance;
					gadgetModule.distance.innerHTML=roundNumber(this.wkDistance,2);
				}
				else{
					this.record();
				}
			}
			else{
				this.altData.push(this.altitude);
				this.speedData.push(this.speed);
				this.dataR.push([Trail.getLastGeoX(), Trail.getLastGeoY()]);
				controlModule.fire('recordingFinished');
			}
		}
	}()),

	clearData:function(){
		this.dataR.length=0;
		this.speedData.length=0;
		this.altData.length=0;
	},

	erase:function(){
		this.clearData();
		this.resetRecording=true;
		this.head=0;
		Trail.reset();
		gadgetModule.totalDistance.innerHTML='0.00';
		gadgetModule.distance.innerHTML='0.00';
		gadgetModule.speed.innerHTML='0.00';
		this.counter=0;
		this.wkDistance=0;
		this.isRunning=false;
		this.paused=false;
		this.status=0;
		gadgetModule.resetTimer();
	},

	reset:function(){
		this.clearData();
		this.resetRecording=true;
		gadgetModule.distance.innerHTML='0.00';
		Trail.moveToStart();
		this.counter=0;
		this.wkDistance=0;
		this.isRunning=false;
		this.paused=false;
		gadgetModule.resetTimer();
		gadgetModule.speed.innerHTML=roundNumber(this.speed, 2);
	},

	segmentLength:function(nespeedTime, prev){
		return Math.sqrt(Math.pow(nespeedTime[0]-prev[0], 2)+Math.pow(nespeedTime[1]-prev[1], 2));
	},
	
	changeFrequency:function(newFrequency){
		this.frequency=newFrequency;
	},

	isMapReady:false,
	mapReady:function(){
		return this.isMapReady;
	},
	setCoordinates:function(lat, lng){
		this.offSetX=Number(lng);
		this.offSetY=Number(lat);
		map.setView([Number(lat), Number(lng)], 13.50);
		this.isMapReady=true;
		globalSettings.mkGrid();
		document.cookie='longitude='+this.offSetX;
		document.cookie='latitude='+this.offSetY;
	},

	frequency:10, //in Hz (The sampling rate of the user motion has to be 10Hz (for Pluto))
	toECEF:true,

	processData:function(fileName){
		if(this.dataR.length==0){
			alert("No data recorded.");
			return;
		}

		/*
		km/h -> km/sec -> mt/sec		
		km/h *(hr/3600sec)*(1000mt/1km)		
		km/h * (1000/3600)
		mt/sec = km/h * (10/36)
		*/
		const mtSec=10.0/36.0;
		const fps=1.0/this.frequency;
		var a=false;

		var cos, sin, t, rawDistance, tz=fps;//1.0/this.frequency;
		var dx, dy, cx, cy;

		var preData=[];
		var pt=Number(0.0);
		var Lat=this.offSetY+Conversion.kmToDDNorth(this.dataR[0][1]*0.001);
		var alt=this.altData[0];
		if(this.toECEF){
			preData.push([pt.toFixed(1), Conversion.toECEF(Lat, this.offSetX+Conversion.kmToDDEast(Lat, this.dataR[0][0]*0.001), alt)]);
			pt+=0.1;
		}
		else{
			preData.push([Lat, this.offSetX+Conversion.kmToDDEast(Lat, this.dataR[0][0]*0.001), alt]);
		}

		for(var i=1; i<this.dataR.length; i++){			
			alt=this.altData[i];
			rawDistance=this.segmentLength(this.dataR[i], this.dataR[i-1]);
			
			if(isNaN(rawDistance)){
				continue;
			}
			
			var spd=this.speedData[i-1]*mtSec;
			if(spd==0){
				console.log('check case speed = 0');
				continue;
			}
			t=rawDistance/spd;
			
			cos=(this.dataR[i][0]-this.dataR[i-1][0])/rawDistance;
			sin=(this.dataR[i][1]-this.dataR[i-1][1])/rawDistance;
			/*
			v=d/t
			d=v*t
			*/
			var dtz=tz*spd;
			dx=cos*dtz;
			dy=sin*dtz;
			cx=this.dataR[i-1][0];
			cy=this.dataR[i-1][1];
			while(t-tz>=0){
				cx+=dx;
				cy+=dy;
				Lat=this.offSetY+Conversion.kmToDDNorth(cy*0.001);
				if(this.toECEF){
					preData.push([pt.toFixed(1), Conversion.toECEF(Lat,this.offSetX+Conversion.kmToDDEast(Lat, cx*0.001), alt)]);
					pt+=0.1;
				}
				else{
					preData.push([Lat, this.offSetX+Conversion.kmToDDEast(Lat, cx*0.001), alt]);
				}
				
				t-=tz;
			
				if(a){
					tz=fps;
					dx=cos*tz*spd;
					dy=sin*tz*spd;
					a=false;
				}
			}
			if(t<tz && t>0.001){
				a=true;
				tz=fps-t;
			}
		}

		var result='';
		var g=(pt.toFixed(1)).toString().length;
		var num;
		for(var i=0; i<preData.length; i++){
			if(this.toECEF){
				num=preData[i][0].toString();
				result+=num.padStart(g, ' ')+','+preData[i][1] + "\n";
			}
			else{
				result+=preData[i][0] +', '+ preData[i][1] + "\n";
			}
		}
		if(this.toECEF){
			download(fileName+".csv", result, "application/csv;charset=utf-8;");
		}
		else{
			download(fileName+".txt", result, 'data:text/plain;charset=utf-8;');
		}
	},

	downloadData:function(fileName){
		var result={};
		result['trail']=Trail.exportData();
		result['recordedData']=this.dataR;
		result['speedData']=this.speedData;
		result['altitudeData']=this.altData;
		result['coordinates']={'lat':this.offSetY, 'lng':this.offSetX};
		download(fileName+".txt", JSON.stringify(result), 'data:text/plain;charset=utf-8;');
	},

	upload:function(fileContents){
		this.erase();
		var dataFile;
		try{
			dataFile=JSON.parse(fileContents.toString());
		}
		catch(e){
			alert("File could not be loaded because it has bad syntax or it's corrupted.");
			return;
		}

		if(dataFile.hasOwnProperty('coordinates')){
			this.setCoordinates(dataFile['coordinates'].lat, dataFile['coordinates'].lng)			
		}
		
		this.head=0;
		if(dataFile.hasOwnProperty('trail')){
			for(var i=0; i<dataFile['trail'].length; i++){
				Trail.addPointLatLng(dataFile['trail'][i]);
				this.head++;
			}
			//console.log('trail length: '+dataFile['trail'].length);
		}

		if(dataFile.hasOwnProperty('recordedData')){
			this.dataR=dataFile['recordedData'];
			//console.log('recorded data: '+this.dataR.length);
		}
		if(dataFile.hasOwnProperty('speedData')){
			this.speedData=dataFile['speedData'];
		}
		if(dataFile.hasOwnProperty('altitudeData')){
			this.altData=dataFile['altitudeData'];
		}

		gadgetModule.totalDistance.innerHTML=roundNumber(Trail.getTrailLengthKm(), 2);
		Trail.moveToStart();
		controlModule.fire('recordingFinished');
	},

	speedStep:0.5,	
	speedStep5:5,
	speedStep2:2,
	speedStep1:1,
	maxSpeed:350,
		
	changeSpeed:function(code){
		var step=0.5;
		if(code==81 || code==87){// q w
			step=this.speedStep5;
		}
		else if(code==65 || code==83){//a s
			step=this.speedStep2;
		}
		else if(code==88 || code==90){ //z x
			step=this.speedStep1;
		}
		else if(code==37 || code==39){
			step=this.speedStep;
		}
		var a=1;
		if(code==37 || code==81 || code==65 || code==90){
			a=-1;
		}
		
		if(a<0){
			if(this.speed>=step){
				this.speed-=step;
			}
			else{
				this.speed=0;
			}
		}
		else{
			if(this.speed<=this.maxSpeed-step){
				this.speed+=step;
			}
			else{
				this.speed=this.maxSpeed;
			}
		}
		document.getElementById('speed_step').innerHTML=step+'km';
		document.getElementById('speed').innerHTML=roundNumber(this.speed, 2);
	},

	setSpeed:function(speed){
		this.speed=Math.abs(speed);
		document.getElementById('speed').innerHTML=roundNumber(this.speed, 2);
	},
};

//####################################################################

function download(fileName, data, dataType)
{
	var csvData = data;
	var blob = new Blob([ csvData ], {type : dataType});

	if(window.navigator.msSaveBlob){
		// FOR IE BROWSER
		navigator.msSaveBlob(blob, fileName);
	}
	else{
		// FOR OTHER BROWSERS
		var element = document.createElement('a');
		element.setAttribute('href', URL.createObjectURL(blob));
		element.setAttribute('download', fileName);
		element.style.display = 'none';
		document.body.appendChild(element);
		element.click();
		document.body.removeChild(element);
	}
	popUpAPI.closing();
}

//####################################################################

drawer.init();	

controlModule.setZoom(13.50);

//####################################################################

window.addEventListener("keydown", function(event){
	if(event.keyCode==38 || event.keyCode==40){//up=38; down=40 
		controlModule.changeAltitude(event.keyCode);
	}
	else if(event.keyCode==37 || event.keyCode==39){//slow=37; fast=39 {
		drawer.changeSpeed(event.keyCode);
	}
	else if(event.keyCode==81 || event.keyCode==87){// q w
		drawer.changeSpeed(event.keyCode);
	}
	else if(event.keyCode==65 || event.keyCode==83){//a s
		drawer.changeSpeed(event.keyCode);
	}
	else if(event.keyCode==88 || event.keyCode==90){ //z x
		drawer.changeSpeed(event.keyCode);
	}
	else {
		//console.log('you pressed: '+event.keyCode);
	}
});

document.onkeydown = function(evt) {
    evt = evt || window.event;
    var keyCode = evt.keyCode;
    if (keyCode >= 37 && keyCode <= 40) {
        return false;
    }
};

window.addEventListener("DOMContentLoaded", function(){
	window.scrollTo(0, 0);
	(function(){
		var dim=document.getElementById('dim');
		var popUp=document.getElementById('pop_wrapper');	
		var body=document.getElementById('pop_up');
		var container=document.getElementById('popup_content');

		popUp.style.top=0.1*window.innerHeight+'px';
		body.style.maxHeight=0.8*window.innerHeight+'px';

		 popUpAPI={
				display:function(){
					dim.style.display='block';
					popUp.style.visibility='visible';
				},
				closing:function(e){
					if(typeof e!=='undefined'){
						e.stopPropagation();
						return;
					}
					popUp.style.visibility='hidden';
					dim.style.display='none';
					document.getElementById('ecef').style.display='none';
					document.getElementById('rawData').style.display='none';
					document.getElementById('configuration').style.display='none';
					document.getElementById('description').style.display='none';
					document.getElementById('wait22').style.display='none';
				},
				exportECEF:function(){
					document.getElementById('popup_title').innerHTML='Export to ECEF';
					document.getElementById('ecef').style.display='block';
					this.display();
				},
				processECEF:function(){
					var frequency=document.getElementById('frequency');
					var fileName=document.getElementById('fileName');
					var x=Number(frequency.value.trim());
					if(!Number.isInteger(x) || x==0){
						alert('Please enter a valid integer frequency.');
						return;
					}
					if(!fileName.value.trim()){
						alert('Please enter a valid file name.');
						return;
					}
					popUpAPI.wait();
					drawer.changeFrequency(x);
					drawer.processData(fileName.value.trim());
					frequency.value='';
					fileName.value='';
					//popUpAPI.closing();
				},
				download:function(){
					document.getElementById('popup_title').innerHTML='Download Path Configuration';
					document.getElementById('rawData').style.display='block';					
					this.display();
				},
				settingsECEF:function(){
					document.getElementById('popup_title').innerHTML='Settings';
					document.getElementById('configuration').style.display='block';					
					this.display();
				},
				whatisit:function(){
					document.getElementById('popup_title').innerHTML='Description';
					document.getElementById('description').style.display='block';					
					this.display();
				},
				wait:function(){
					document.getElementById('popup_title').innerHTML='Processing data';
					document.getElementById('wait22').style.display='block';					
					this.display();
				},
				processDownload:function(){
					var fileName=document.getElementById('fileNameR');
					if(!fileName.value.trim()){
						alert('Please enter a valid file name.');
						return;
					}
					drawer.downloadData(fileName.value.trim());
					fileName.value='';
					this.closing();
					document.getElementById('rawData').style.display='none';
				},
		};

		document.getElementById('closePopUp').addEventListener('click', function(){
			popUpAPI.closing();
		});

		dim.addEventListener('click', function(){
			popUpAPI.closing();
		});

		popUp.addEventListener('click', function(){
			popUpAPI.closing();
		});

		container.addEventListener('click', function(event){
			popUpAPI.closing(event);
		}); 
		
		document.getElementById('export').addEventListener('click', function () {
			popUpAPI.exportECEF();
		});

		document.getElementById('settings').addEventListener('click', function () {
			popUpAPI.settingsECEF();
		});

		document.getElementById('ecefButton').addEventListener('click', function () {
			popUpAPI.processECEF();
		});
		
		document.getElementById('exportData').addEventListener('click', function () {
			popUpAPI.download();
		});

		document.getElementById('whatisit').addEventListener('click', function () {
			popUpAPI.whatisit();
		});

		document.getElementById('rawDataButton').addEventListener('click', function () {
			popUpAPI.processDownload();
		});

		document.getElementById('locationButton').addEventListener('click', function () {
			var latitude=Number(document.getElementById('latitude').value);
			var longitude=Number(document.getElementById('longitude').value);			
			if(Number.isNaN(latitude) || Number.isNaN(longitude)){
				alert('Please enter a valid number.');
				return;
			}
			drawer.setCoordinates(latitude, longitude);
		});

		document.getElementById('coloursButton').addEventListener('click', function () {
			var trailColour=document.getElementById('trail_colour').value;
			var moverColour=document.getElementById('mover_colour').value;
			trailColour=trailColour.trim();
			moverColour=moverColour.trim();
			if(trailColour==''){
				trailColour="#ffb366";
			}
			if(moverColour==''){
				moverColour='blue';
			}
			Trail.setColours(trailColour, moverColour);
		});
		
		if(document.cookie==''){
			popUpAPI.whatisit();
			document.cookie="whatisit=yes";
		}

		var latLng=ReadCookie();
		drawer.setCoordinates(latLng.lat, latLng.lng);

	})();
})
