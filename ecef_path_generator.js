 /*********************************************************************
 * ecef_path_generator.js                                             *
 *                                                                    *
 * Version: 1.0                                                       *
 * Date:    13-08-2020                                                *
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

	var canvasWidth=document.getElementById('canvas').clientWidth;
	var canvasHeight=diff;
	const baseFactor=206;
	const baseZoom=14.25;
	globalSettings={
		baseZ:baseZoom,
		grid:[],
		Height:canvasHeight,
		Width:canvasWidth,
		scaleFactor:baseFactor,
		getScaleFactor:function(){
			return this.scaleFactor
		},
		setScaleFactor:function(delta){
			this.scaleFactor=Math.pow(2, (Number(delta)))*baseFactor;
		},
		gridSettings:{stroke: "#2929a3",'stroke-width':0.2, opacity: 0.6},
		paper:Raphael("canvas", canvasWidth,canvasHeight),
		
		/*mkGrid:function(){
			if(this.grid.length>0){
				for(var i=0; i<this.grid.length; i++){
					this.grid[i].remove();
				}
				this.grid.length=0;
			}
			for(var i=0; i<Math.floor(this.Height/this.scaleFactor); i++){
				this.grid.push(this.paper.path('M0,'+(i+1)*this.scaleFactor+'L'+this.Width+','+(i+1)*this.scaleFactor).attr(this.gridSettings));
			}

			for(var i=0; i<Math.floor(this.Width/this.scaleFactor); i++){
				this.grid.push(this.paper.path('M'+(i+1)*this.scaleFactor+',0L'+(i+1)*this.scaleFactor+','+this.Height).attr(this.gridSettings));
			}
		},//*/
		
		wMtPx:0,
		hMtPx:0,
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
	};



	//globalSettings.mkGrid();
	return globalSettings;
})();


//####################################################################
//####################################################################
//####################################################################

function drawPath(cbk) {
	var canvas=document.getElementById('canvas');
	canvas.onmousedown=function(){
		document.onmouseup = closeDrawElement;
		document.onmousemove = elementDraw;
		console.log(window.scrollY);
	};

	var lx=canvas.getBoundingClientRect().left;
	var ly=canvas.getBoundingClientRect().top;
	var x, y;
	var rx=lx+globalSettings.Width;
	var ry=ly+globalSettings.Height;

	function elementDraw(e) {
		x=e.clientX;
		y=e.clientY;
		if(x>lx && x<rx && y>ly && y<ry){
			cbk(x-lx, y-ly);//+window.scrollY);
			console.log(window.scrollY+' :: '+(y-ly));
			//cbk(x-lx, y-ly+window.scrollY);
		}
	}

	function closeDrawElement() {
		/* stop moving when mouse button is released:*/
		document.onmouseup = null;
		document.onmousemove = null;
	}
}

//####################################################################
//####################################################################
//####################################################################

var map = L.map('map',{      
		minZoom: 0,
		zoomSnap: 0,
		zoomDelta: 0.25,
		zoomControl:false,
});

// add the OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>'
}).addTo(map);

L.control.scale({maxWidth:300}).addTo(map);

var ZoomViewer = L.Control.extend({
	onAdd: function(){
		var container= L.DomUtil.create('div');
		var gauge = L.DomUtil.create('div');
		container.style.width = '200px';
		container.style.background = 'rgba(255,255,255,0.5)';
		container.style.textAlign = 'left';
		map.on('zoomstart zoom zoomend', function(ev){
			gauge.innerHTML = 'Zoom level: ' + map.getZoom();
		})
		container.appendChild(gauge);
		return container;
	}
});

(new ZoomViewer).addTo(map);

map.setView([53.2672, -1.63], 14.25);


//####################################################################
//####################################################################

var Set={
	set:[],
	Scale:function(scaleFactor){
		var tmpBox;
		this.looping(function(shape){
			tmpBox=shape.getBBox(); 
			shape.attr({cx:tmpBox.cx*(scaleFactor), cy:tmpBox.cy*(scaleFactor),r:Math.abs(tmpBox.y-tmpBox.cy)*scaleFactor});
		});
	},
	looping:function(doSomething){
		var i, len=this.set.length;
		for(i=0; i<len; i++){
			doSomething(this.set[i]);
		}
	},
	reset:function(){
		this.looping(function(shape){
			shape.remove();
		});
		this.set.length=0;
	},
	removeLast:function(){
		if(this.set.length>0){
			this.set[this.set.length-1].remove();
			this.set.length--;		
		}
	},
};

//####################################################################
//####################################################################

var objectEvent={
	handlers:{},
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

//####################################################################
//####################################################################

var controlModule=(function(){
	var module=Object.create(objectEvent);
	module.playButton=document.getElementById('player');
	module.pauseButton=document.getElementById('pause');
	module.recordButton=document.getElementById('record');
	module.recordingButton=document.getElementById('recording');
	module.deleteButton=document.getElementById('delete');
	module.eraseButton=document.getElementById('erase');
	module.resetButton=document.getElementById('reset');
	module.slider = document.getElementById('speedRange');
	module.sliderR = document.getElementById('xRange');
	module.scaleRange = document.getElementById('scaleRange');

	module.setZoom=function(zoomVal){
		this.fire('scaleChange', zoomVal);
		this.scaleRange.value=zoomVal;
	}

	module.init=function(){
		document.getElementById('upload').addEventListener('change', readSingleFile);

		this.playButton.addEventListener('click', function () {
			module.fire('play');
			module.playButton.style.display='none';
			module.pauseButton.style.display='block';
		});

		this.pauseButton.addEventListener('click', function () {
			module.fire('pause');
			module.pauseButton.style.display='none';
			module.playButton.style.display='block';
		});

		this.recordButton.addEventListener('click', function () {
			module.fire('record');
			module.recordButton.style.display='none';
			module.recordingButton.style.display='block';
		});

		this.deleteButton.addEventListener('click', function () {
			module.fire('delete');
			module.pauseButton.style.display='none';
			module.playButton.style.display='none';
			module.recordingButton.style.display='none';
			module.recordButton.style.display='block';
		});

		this.resetButton.addEventListener('click', function () {
			module.fire('reset');
			module.pauseButton.style.display='none';
			module.playButton.style.display='none';
			module.recordingButton.style.display='none';
			module.recordButton.style.display='block';
		});

		this.eraseButton.addEventListener('click', function () {
			module.fire('erase');
		});

		this.addHandler('scaleChange', function(x){
			//var base=14.25;
			//map.setZoom(globalSettings.baseZ+Number(x));	
		});

		this.addHandler('readyToPlay', function(){
			module.pauseButton.style.display='none';
			module.playButton.style.display='block';
		});
		this.addHandler('recordingFinished', function(){
			module.recordingButton.style.display='none';
			module.recordButton.style.display='none';
			module.playButton.style.display='block';
		});

		this.slider.oninput = function() {
			module.fire('speedRange', roundNumber(this.value,2));
		}

		this.sliderR.oninput = function() {
			module.fire('timeFactor', this.value); 
			document.getElementById('speedUp').innerHTML='x'+Math.pow(2,this.value);
		}
		
		this.scaleRange.oninput = function() {
			module.fire('scaleChange', this.value); 
		}
	};

	module.getSlidersInput=function(){
		module.slider.oninput();
		module.sliderR.oninput();
	};
	return module;
})();

//####################################################################
//####################################################################

var gadgetModule=(function(){
	var module=Object.create(objectEvent);

	module.distance=document.getElementById('distance');
	module.totalDistance=document.getElementById('Tdistance');
	module.speed=document.getElementById('speed');
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
			factor=Math.pow(2, x);
		}

		return function(t){
			time+=t;
			k=roundNumber(0.07+factor*time/1000, 2);
			module.elapsedTime.innerHTML=k;
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

	return module;	
})();


//####################################################################
//####################################################################

var drawer={
	mover:globalSettings.paper.circle(0,0,2).attr({stroke:'none', fill: "blue"}),
	trail:Object.create(Set),
	trialSettings:{stroke:'none', fill: "#ffb366"},
	xT:2,
	status:0,
	init:function(){
		drawPath(function(x,y){
			drawer.getData(x,y);
		});

		controlModule.init();

		controlModule.addHandler('speedRange', function(x){
			drawer['rSpeed']=x;
			document.getElementById('speed').innerHTML=x;
		});

		controlModule.addHandler('timeFactor', function(x){
			drawer['xT']=Math.pow(2, x);
			gadgetModule.changeTimeFactor(x);
		});

		controlModule.getSlidersInput();

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
			if(drawer.isResizeble()){
				map.setZoom(globalSettings.baseZ+Number(x));	
				setTimeout(function(){
					globalSettings.mkGrid();
					drawer.setScaleFactor(globalSettings.getScaleFactor());
				}, 500);				
			}
			else{
				alert('In order to change the zoom the current path must be deleted')
			}
		});	
	},
	mxG:10,
	scaleFactor:globalSettings.getScaleFactor(),//50, //1km=scaleFactor px: 
	isResizeble:function(){
		if(this.data.length==0){
			return true;
		}
		return false;
	},
	setScaleFactor:function(newScaleFactor){
		this.scaleFactor=newScaleFactor;
	},
	speedData:[],
	data:[],
	totalDistance:0,
	getData:function(x, y){
		if(this.status>0){
			return;
		}
		var d=0;
		if(this.head>0){
			d=Math.sqrt(Math.pow(x-this.data[this.head-1][0], 2)+Math.pow(y-this.data[this.head-1][1], 2));
		}

		if(d>this.mxG){
			var k=this.head-1;
			var r=Math.ceil(d/this.mxG);
			var f=1;
			if(x-this.data[k][0]<0){
				f=-1;
			}
			var g=1;
			if(y-this.data[k][1]<0){
				g=-1;
			}
			var tx=Math.abs(x-this.data[k][0])/r;
			var ty=Math.abs(y-this.data[k][1])/r;
			for(var j=1; j<r; j++){
				this.data.push([this.data[k][0]+j*tx*f, this.data[k][1]+j*ty*g]);
				this.trail.set.push(globalSettings.paper.circle(this.data[k][0]+j*tx*f, this.data[k][1]+j*ty*g,2).attr(this.trialSettings));
				this.head++;
			}
		}

		if(d>this.mxG ||this.head==0){
			this.trail.set.push(globalSettings.paper.circle(x,y,2).attr(this.trialSettings));
			this.data.push([x, y]);
			this.head++;
		
			this.totalDistance+=d;
			gadgetModule.totalDistance.innerHTML=roundNumber(this.totalDistance/this.scaleFactor, 2);
		}
	},

	deleteLast:function(){
		if(this.status>0){
			return;
		}
		
		if(this.trail.set.length>0){
			this.head--;
			if(this.head>0){
				this.totalDistance-=this.segmentLength(this.data[this.head], this.data[this.head-1]);
				gadgetModule.totalDistance.innerHTML=roundNumber(this.totalDistance/this.scaleFactor, 2);
			}
			this.trail.removeLast();
			this.data.pop();			
		}
	},
	counter:0,
	head:0,
	paused:false,
	halt:function(){
		this.paused=true;
	},
	isRunning:false,
	rSpeed:1,
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

		this.mover.toFront();
		this.mover.attr({transform: 't'+(this.dataR[this.counter][0])+','+(this.dataR[this.counter][1])});

		controlModule.getSlidersInput();
		gadgetModule.resetTimer();
		gadgetModule.startTimer();

		if(this.rSpeed>0){
			this.isRunning=true;
			this.counter++;
			this.run();
		}
	},

	wkDistance:0,
	run:(function(){
		const msH=1/3600000;
		var r, d, time;
		var residuo=0;
		return function(){
			if(this.paused){
				return;
			}
			if(this.counter<this.dataR.length){
				gadgetModule.speed.innerHTML=this.speedData[this.counter-1];//this.rSpeed;

				r=this.xT*(this.speedData[this.counter-1]*this.scaleFactor)*msH;
				if(r>0){
					d=this.squareData[this.counter-1];
					
					residuo+=(d/r);
					time=Math.round(residuo);
					residuo-=time;
					this.mover.animate({transform: 't'+(this.dataR[this.counter][0])+','+(this.dataR[this.counter][1])}, time, "linear");
					setTimeout(function(){
						gadgetModule.timer(time);
						this.run();	
					}.bind(this), time);

					this.counter++;
					this.wkDistance+=d/drawer.scaleFactor;
					gadgetModule.distance.innerHTML=roundNumber(this.wkDistance,2);
				}
			}
			else{
				controlModule.fire('readyToPlay');
				this.isRunning=false;
			}
		}
	})(),

	resetRecording:true,
	squareData:[],
	dataR:[],

	record:(function(){
		const msH=1/3600000;
		var residuo, d, time, p=0;
		var counterR=0;
		return function(){
			if(this.head==0){
				return;
			}
			if(this.resetRecording){
				p=0;
				residuo=0;
				this.resetRecording=false;
				this.dataR.length=0;
				this.dataR.push([this.data[0][0], this.data[0][1]]);
				counterR=1;
				this.mover.toFront();
				this.mover.attr({transform: 't'+(this.data[0][0])+','+(this.data[0][1])});
				this.counter=0;
				this.status=1;
				gadgetModule.startTimer();
			}

			if(p>0 || this.counter<this.head-1){
				this.speedData[counterR-1]=this.rSpeed;
				r=this.xT*(this.rSpeed*this.scaleFactor)*msH;
				if(r>0){
					if(p==0){			
						p=1;
						this.counter++;
						this.dataR.push([this.data[this.counter][0], this.data[this.counter][1]]);
						
						d=Math.sqrt(Math.pow(this.dataR[counterR][0]-this.dataR[counterR-1][0], 2)+Math.pow(this.dataR[counterR][1]-this.dataR[counterR-1][1], 2));					
						time=d/r;
						
						if(time>400){							
							this.dataR.pop();
							p=Math.ceil(time/250);

							var f=1;
							if(this.data[this.counter][0]-this.data[this.counter-1][0]<0){
								f=-1;
							}
							var g=1;
							if(this.data[this.counter][1]-this.data[this.counter-1][1]<0){
								g=-1;
							}
							var tx=Math.abs(this.data[this.counter][0]-this.data[this.counter-1][0])/p;
							var ty=Math.abs(this.data[this.counter][1]-this.data[this.counter-1][1])/p;
						
							for(var j=1; j<p; j++){
								this.dataR.push([this.data[this.counter-1][0]+j*tx*f, this.data[this.counter-1][1]+j*ty*g]);
							}
							this.dataR.push([this.data[this.counter][0], this.data[this.counter][1]]);
						}
					}
					
					d=Math.sqrt(Math.pow(this.dataR[counterR][0]-this.dataR[counterR-1][0], 2)+Math.pow(this.dataR[counterR][1]-this.dataR[counterR-1][1], 2));					
					this.squareData.push(d);
					residuo+=(d/r);
					time=Math.round(residuo);
					residuo-=time;

					this.mover.animate({transform: 't'+(this.dataR[counterR][0])+','+(this.dataR[counterR][1])}, time, "linear");

					setTimeout(function(){
						gadgetModule.timer(time);
						this.record();	
					}.bind(this), time);					
					counterR++;
					p--;					
					this.wkDistance+=d/drawer.scaleFactor;
					gadgetModule.distance.innerHTML=roundNumber(this.wkDistance,2);
				}
			}
			else{
				controlModule.fire('recordingFinished');
			}
		}
	}()),
	erase:function(){
		this.data.length=0;
		this.dataR.length=0;
		this.squareData.length=0;
		this.resetRecording=true;
		this.head=0;
		this.totalDistance=0;
		this.trail.reset();
		gadgetModule.totalDistance.innerHTML='0.00';
		gadgetModule.distance.innerHTML='0.00';
		gadgetModule.speed.innerHTML='0.00';
		this.mover.attr({transform: 't'+(0)+','+(0)});
		this.counter=0;
		this.speedData.length=0;
		this.heightData.length=0;
		this.wkDistance=0;
		this.isRunning=false;
		this.paused=false;
		this.status=0;
		gadgetModule.resetTimer();
		controlModule.getSlidersInput();
	},
	heightData:[],
	reset:function(){
		this.dataR.length=0;
		this.squareData.length=0;
		this.resetRecording=true;
		gadgetModule.distance.innerHTML='0.00';
		gadgetModule.speed.innerHTML='0.00';
		this.mover.attr({transform: 't'+(this.data[0][0])+','+(this.data[0][1])});		
		this.counter=0;
		this.speedData.length=0;
		this.heightData.length=0;
		this.wkDistance=0;
		this.isRunning=false;
		this.paused=false;
		this.rSpeed=1;
		gadgetModule.resetTimer();
		controlModule.getSlidersInput();
	},
	segmentLength:function(next, prev){
		return Math.sqrt(Math.pow(next[0]-prev[0], 2)+Math.pow(next[1]-prev[1], 2));
	},
	changeFrequency:function(newFrequency){
		this.frequency=newFrequency;
	},

	setCoordinates:function(centerLong, centerLat, centerAlt){
		this.offSetX=Number(centerLong);
		this.offSetY=Number(centerLat);
		this.offSetZ=Number(centerAlt);
	},

	frequency:10, //in Hz (The sampling rate of the user motion has to be 10Hz (for Pluto))
	offSetX:-1.63,
	offSetY:53.2672,
	offSetZ:30,
	toECEF:false,

	processData:function(fileName){
		const ks=3600; //sec per hr
		const sk=1.0/ks;
		var a=false;
		var fps=1.0/this.frequency;
		var wr=ks/this.scaleFactor;
		var cos, sin, t, rawDistance, tz=fps;//1.0/this.frequency;
		const scFacInv=1.0/this.scaleFactor;
		var j, dx, dy, cx, cy;
		var relX=globalSettings.Width/2;
		var relY=globalSettings.Height/2;
		var preData=[];
		var pt=Number(0.0);
		var Lat=this.offSetY+Conversion.kmToDDNorth((relY-this.dataR[0][1])*scFacInv);
		if(this.toECEF){
			preData.push([pt.toFixed(1), Conversion.toECEF(Lat, this.offSetX+Conversion.kmToDDEast(Lat, (this.dataR[0][0]-relX)*scFacInv), this.offSetZ)]);
		}
		else{
			preData.push([Lat, this.offSetX+Conversion.kmToDDEast(Lat, (this.dataR[0][0]-relX)*scFacInv)]);
		}
		pt+=0.1;

		for(var i=1; i<this.dataR.length; i++){				
			rawDistance=this.segmentLength(this.dataR[i], this.dataR[i-1]);
			t=wr*rawDistance/this.speedData[i-1];
			cos=(this.dataR[i][0]-this.dataR[i-1][0])/rawDistance;
			sin=(this.dataR[i][1]-this.dataR[i-1][1])/rawDistance;
			dx=tz*cos*this.speedData[i-1]*sk;
			dy=tz*sin*this.speedData[i-1]*sk;
			j=1;
			cx=this.dataR[i-1][0]*scFacInv;
			cy=this.dataR[i-1][1]*scFacInv;
			while(t-tz>=0){
				cx+=dx;
				cy+=dy;
				Lat=this.offSetY+Conversion.kmToDDNorth(relY*scFacInv-cy);
				if(this.toECEF){
					preData.push([pt.toFixed(1), Conversion.toECEF(Lat,this.offSetX+Conversion.kmToDDEast(Lat, cx-relX*scFacInv), this.offSetZ)]);
				}
				else{
					//console.log('x: '+cx+' y: '+cy+' t: '+t.toFixed(5)+' tz:'+tz);
					preData.push([Lat, this.offSetX+Conversion.kmToDDEast(Lat, cx-relX*scFacInv)]);
				}
				pt+=0.1;
				j++;
				t-=tz;
				if(a){
					tz=fps;
					dx=tz*cos*this.speedData[i-1]*sk;
					dy=tz*sin*this.speedData[i-1]*sk;
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
		download(fileName+".csv",result);
	},
	downloadData:function(fileName){
		var result=JSON.stringify(this.data)+"\n";
		result+=JSON.stringify(this.dataR)+"\n";
		result+=JSON.stringify(this.squareData)+"\n";
		result+=JSON.stringify(this.speedData)+"\n";
		result+=JSON.stringify(this.heightData);
		download(fileName+".txt",result);
	},
	upload:function(fileContents){
		this.erase();
		var chunks=fileContents.split("\n");
		this.data=JSON.parse(chunks[0].toString());
		this.dataR=JSON.parse(chunks[1]);
		this.squareData=JSON.parse(chunks[2]);
		this.speedData=JSON.parse(chunks[3]);
		this.heightData=JSON.parse(chunks[4]);
		var d=0;
		this.trail.set.push(globalSettings.paper.circle(this.data[0][0], this.data[0][1],2).attr(this.trialSettings));
		this.head=1;
		for(var i=1; i<this.data.length; i++){
			d+=this.segmentLength(this.data[i], this.data[i-1]);
			this.trail.set.push(globalSettings.paper.circle(this.data[i][0], this.data[i][1],2).attr(this.trialSettings));
			this.head++;
		}		
		this.totalDistance+=d;
		gadgetModule.totalDistance.innerHTML=roundNumber(this.totalDistance/this.scaleFactor, 2);
		controlModule.fire('recordingFinished');
	}
};

//####################################################################

function download(filename, text) {
	var element = document.createElement('a');
	element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
	element.setAttribute('download', filename);
	element.style.display = 'none';
	document.body.appendChild(element);
	element.click();
	document.body.removeChild(element);
}



//####################################################################

drawer.init();	

controlModule.setZoom(-0.50);


//####################################################################

window.addEventListener("DOMContentLoaded", function(){
	window.scrollTo(0, 0);
	(function(){
		var dim=document.getElementById('dim');
		var popUp=document.getElementById('pop_wrapper');	
		var body=document.getElementById('pop_up');
		//var body=document.getElementById('closePopUp');
		var container=document.getElementById('popup_content');

		popUp.style.top=0.1*window.innerHeight+'px';
		body.style.maxHeight=0.8*window.innerHeight+'px';

		var popUpAPI={
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
					//console.log(x);
					if(!Number.isInteger(x) || x==0){
						alert('Please enter a valid integer frequency.');
						return;
					}
					if(!fileName.value.trim()){
						alert('Please enter a valid file name.');
						return;
					}
					drawer.changeFrequency(x);
					drawer.processData(fileName.value.trim());
					frequency.value='';
					fileName.value='';
					this.closing();
					document.getElementById('ecef').style.display='none';
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
			var altitude=Number(document.getElementById('altitude').value);
					
			if(Number.isNaN(latitude) || Number.isNaN(longitude) || Number.isNaN(altitude)){
				alert('Please enter a valid number.');
				return;
			}
			document.cookie='longitude='+longitude;
			document.cookie='latitude='+latitude;
			document.cookie='altitude='+altitude;
			drawer.setCoordinates(longitude, latitude, altitude);
			map.setView([latitude, longitude], 14.25);
		});
		
		if(document.cookie==''){
			popUpAPI.whatisit();
			document.cookie="whatisit=yes";
		}
		else{
			cookies={};
			ReadCookie();
			if(cookies.hasOwnProperty('latitude') && cookies.hasOwnProperty('longitude')){
				drawer.setCoordinates(cookies.longitude, cookies.latitude, cookies.altitude);
				map.setView([Number(cookies.latitude), Number(cookies.longitude)], 14.25);
			}
		}

	})();
})

function ReadCookie() {
	var allcookies = document.cookie;
	cookiearray = allcookies.split(';');
	
	for(var i=0; i<cookiearray.length; i++) {
		name=cookiearray[i].split('=')[0];
		cookies[name.trim()]=cookiearray[i].split('=')[1];
	}
}