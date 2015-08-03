module.exports = function (RED) {

    "use strict";

    var genericSensor = require('../../../lwm2m/ipsoGenericSensor');

    function PeripheralServices(n) {
        // Create a RED node
        RED.nodes.createNode(this, n);
        var theNode = this;
        this.on('input', function (msg) {
            var sensor = genericSensor.getGenericSensor(msg.payload.peripheralUuid, 
                    msg.payload.serviceUuid, msg.payload.characteristicUuid); 
           sensor.setValue(msg.data);
        });
    };
    // Register the node by name. This must be called before overriding any of the
    // Node functions.
    RED.nodes.registerType("update sensor", PeripheralServices);


}