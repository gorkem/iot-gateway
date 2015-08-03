/*eslint-env node */
var noble = require('noble'),
	events = require('events'),
	util = require('util'),
	bleSensor = require('./bleSensor');

function BlePeripherals(){
	events.EventEmitter.call(this);
	this.serviceUUIDs=['ccc0'];
	this.characteristicUUIDs=['ccc1'];
	this._registerListeners();
}
util.inherits(BlePeripherals, events.EventEmitter);

BlePeripherals.prototype._discoverServices = function (peripheral){
	var that = this;
	console.log('Discovering services on '+ peripheral.advertisement.localName);
	peripheral.discoverSomeServicesAndCharacteristics(this.serviceUUIDs, this.characteristicUUIDs,
	function(error, services, characteristics){
		if(error){
			console.log(error);
		}
		for (var i=0; i<characteristics.length; i++) {
			var sensor = new bleSensor.BleSensor(characteristics[i]);
			that.emit('sensorDiscovered',sensor);
		}
	});
};

BlePeripherals.prototype._registerListeners = function(){
	var that = this;
	noble.on('stateChange', function(state){
		that._handleStateChanges(state);
	});
	noble.on('discover', function(peripheral){
		that._handlePeripheralDiscovery(peripheral);	
	});
};

BlePeripherals.prototype._handlePeripheralDiscovery = function(peripheral){
  console.log('peripheral discovered: ' );
  console.log(peripheral.advertisement);
  var that = this;
  peripheral.connect(function(err){
  	if(err){
  		console.log(err);
  	}else{
  		that._discoverServices(peripheral);
  	}
  });
};

BlePeripherals.prototype._handleStateChanges = function(state){
	if(state === 'poweredOn'){
		noble.startScanning();
	}else{
		noble.stopScanning();
	}
};

exports.BlePeripherals = BlePeripherals;

