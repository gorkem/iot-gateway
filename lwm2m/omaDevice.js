
var lwm2m = require('lwm2m-node-lib');
var lClient = lwm2m.client;

module.exports = {
		attributes: {
	 	0:"Red Hat", //manufacturer
	    1:"Model T", //model number
	    2:"1", //serial number
 	    3:"0.1", //firmware version
	    4:reboot, //reboot
		5:factoryReset, //reset
		6:0, // power 
		7:0, //voltage
		8:0, //current
		9:100, // battery level
		10:freeMemory, //memory free
		11:0, // error code
		12:0, // reset error code
		13:currentTime,
		14:utcOffset, //UTC ofset
		15:0,// timezone
		16:"U" // supported modes (UDP)
		},
	 
	register: function () {
		var objectUri = '/3/0';
		lClient.registry.create(objectUri, function (error, obj) {
            console.log(error);
        });

		var resourceResult = function (error, obj) {console.log(error);};
		for (var index = 0; index < 16; index++) {
			lClient.registry.setResource(objectUri, index, this.attributes[index], resourceResult);
		}
		return objectUri;
	}
};
		
function reboot(){
	//TODO: implement
}
function factoryReset(){
	//TODO: implement
}

// Read functions
function freeMemory(){
	var os = require('os');
	return os.freemem()/1024;
}

function utcOffset(){
	var date = new Date();
	return date.getTimezoneOffset()/60;
}

function  currentTime() {
	var date = new Date();
	return date.getTime();
}
