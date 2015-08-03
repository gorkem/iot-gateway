var lwm2m = require('lwm2m-node-lib');
var lClient = lwm2m.client;
var lwm2mManager = require('./lwm2mManager');
var sensors = {};
function GenericSensor(){
	var that = this;
	this.sensorValue = this.maxValue = this.minValue = 0;
	this.attributes = {
		5700: function(){return that.getValue();}, //sensor value
		5701: "",
		5601: function(){return that.getMinValue();}, //min measured
		5602: function(){return that.getMaxValue();}, // max measured
		5603: 0,
		5604: 0,
		5605: 0,
		5750: "",
		5751: ""
	};
	
}

GenericSensor.prototype.setValue = function (newValue) {
	this.sensorValue = newValue;
	this.maxValue = Math.max(this.sensorValue, this.maxValue);
	if(this.minValue === 0){
		this.minValue = this.sensorValue;
	}else{
		this.minValue = Math.min(this.sensorValue, this.minValue);
	}
};


GenericSensor.prototype.getMinValue = function () {
	return this.minValue;
};
GenericSensor.prototype.getMaxValue = function () {
	return this.maxValue;
};

GenericSensor.prototype.getValue = function () {
	return this.sensorValue;
};

GenericSensor.prototype.register= function(){
	var instanceId = -1;
	do {//find next available instance id
		instanceId++;
		var objectUri = "/3300/" + instanceId;
		var existingSensor = lwm2mManager.registry[objectUri];
	} while (existingSensor);
	var resourceResult = function (error, obj) { if(error) console.log(error); console.log(obj)};
	lClient.registry.create(objectUri, resourceResult);
	for( var resId in this.attributes){
		if(this.attributes.hasOwnProperty(resId)){
			lClient.registry.setResource(objectUri, resId, this.attributes[resId], resourceResult);
		}
	}
	lwm2mManager.registry[objectUri] = this;
	//let server know about the new object.
	lwm2mManager.update();	
};

function getGenericSensor(peripheralUuid, serviceUuid, characteristicUuid){
	var sensorUri = '/'+peripheralUuid + '/' + serviceUuid + '/'+characteristicUuid;
	if(sensors[sensorUri]){
		return sensors[sensorUri];
	}
	var sensor = new GenericSensor();
	sensor.register();
	sensors[sensorUri] = sensor;
	return sensor;
};

module.exports.getGenericSensor = getGenericSensor;
