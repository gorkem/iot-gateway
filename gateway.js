var lwm2mManager = require('./lwm2m/lwm2mManager');
var noderedManager = require('./node-red/noderedManager');

//Start lwm2m
lwm2mManager.start();
//Start node-red
noderedManager.start();
