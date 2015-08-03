module.exports = function(RED) {

   "use strict";
    var noble = require('noble');
    var os = require('os');
   
    
    function PeripheralServices(n) {
        // Create a RED node
        RED.nodes.createNode(this,n);
        var theNode = this; 
        this.on('input', function(msg){
            if(msg.peripheral){
                msg.peripheral.connect(function(err){
                    if(err){
                        theNode.error("Error connection to "+msg.peripheral.advertisement.localName);
                    }else{
                        discoverServices(msg.peripheral);
                    }
                });
            }
        });
       
    function readCharacteristic(characteristic, peripheral ){
        characteristic.read(function(error, data){
            if(error){
                theNode.error(error);
            }else{
                var msg =  { payload:{characteristicUuid:characteristic.uuid, 
                peripheralUuid:peripheral.uuid,
                peripheralName:peripheral.advertisement.localName,
                serviceUuid: characteristic._serviceUuid } };
                
			     msg.data = data;
                 peripheral.disconnect(function(error){
                     if(error){
                        theNode.warn("Error disconnecting "+ peripheral.advertisement.localName);
                     }   
                 });
                 theNode.send(msg);
                 
            }
        });
    }   
    function discoverServices(peripheral){
	   theNode.log('Discovering services on '+ peripheral.advertisement.localName);
        var services = n.serviceUUIDs || [];
        var characs = n.characteristicUUIDs || [];
	   peripheral.discoverSomeServicesAndCharacteristics(services, characs,
	   function(error, services, characteristics){ 
		  if(error){
		      theNode.error(error);
		  }else{
            theNode.log("characteristics discovered");
		    for (var i=0; i<characteristics.length; i++) {
                    readCharacteristic(characteristics[i], peripheral);
		      }
            }
	   });
    };    

    }
    
    // Register the node by name. This must be called before overriding any of the
    // Node functions.
    RED.nodes.registerType("read characteristics",PeripheralServices);

	
}