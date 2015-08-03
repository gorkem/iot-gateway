"use strict";

var lwm2m = require('lwm2m-node-lib');

var lClient = lwm2m.client;
var theDeviceInfo = {};

var manager = {
    registry:{},
    
    start: function () {
        var omaDevice = require('./omaDevice.js');
        this.registry[omaDevice.register()] = omaDevice;
        var that = this;
        lClient.register('localhost', '5683', '', 'nodeClientTest', function (error, deviceInfo) {
            if (error) {
                console.log(error);
            } else {
                that.setHandlers(deviceInfo);
            }
        });
    },
    
    setHandlers: function(deviceInfo){
                var that = this;
                theDeviceInfo = deviceInfo;                
                lClient.setHandler(deviceInfo.serverInfo, 'read', function (objectType, objectId, resourceId, value, callback){
                    that.handleRead(objectType, objectId, resourceId, value, callback);});
                lClient.setHandler(deviceInfo.serverInfo, 'write', function (objectType, objectId, resourceId, value, callback){
                    that.handleWrite(objectType, objectId, resourceId, value, callback);});
                lClient.setHandler(deviceInfo.serverInfo, 'execute', function (objectType, objectId, resourceId, value, callback){
                    that.handleExecute(objectType, objectId, resourceId, value, callback);});

    },
    
    update: function(){
        var that =this;
        lClient.update(theDeviceInfo, function(error) {
            if(error){
              console.log(error);   
            } 
            else{
                that.setHandlers(theDeviceInfo);
            }
        });
    },
    
    handleRead: function (objectType, objectId, resourceId, value, callback) {
        var objectUri = "/"+objectType+"/"+objectId;
        var registryObject = this.registry[objectUri];
        if (registryObject && typeof (registryObject.attributes[resourceId]) === 'function') {
            var valueFuction = registryObject.attributes[resourceId];
            callback(null, valueFuction());
        }
        else {
            console.log('\nValue read:\n--------------------------------\n');
            console.log('-> ObjectType: %s', objectType);
            console.log('-> ObjectId: %s', objectId);
            console.log('-> ResourceId: %s', resourceId);
            console.log('-> Read Value: %s', value);
            callback(null);
        }
    },

    handleWrite: function (objectType, objectId, resourceId, value, callback) {
        console.log('\nValue written:\n--------------------------------\n');
        console.log('-> ObjectType: %s', objectType);
        console.log('-> ObjectId: %s', objectId);
        console.log('-> ResourceId: %s', resourceId);
        console.log('-> Written value: %s', value);

        callback(null);
    },

    handleExecute: function handleExecute(objectType, objectId, resourceId, value, callback) {
        console.log('\nCommand executed:\n--------------------------------\n');
        console.log('-> ObjectType: %s', objectType);
        console.log('-> ObjectId: %s', objectId);
        console.log('-> ResourceId: %s', resourceId);
        console.log('-> Command arguments: %s', value);

        callback(null);
    }

};

module.exports = manager;
