

module.exports = function (RED) {

    "use strict";

    var lwm2mManager = require('../../../lwm2m/lwm2mManager');

    function PeripheralServices(n) {
        // Create a RED node
        RED.nodes.createNode(this, n);
        var theNode = this;
        var objectUri = "/"+n.objectType+"/"+n.objectId;
        var resourceId =  n.resourceId;
        
        
    };
    // Register the node by name. This must be called before overriding any of the
    // Node functions.
    RED.nodes.registerType("lwm2m handler", PeripheralServices);


}