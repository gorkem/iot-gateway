/**
 * Copyright 2013,2015 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function(RED) {
    "use strict";
    var mqtt = require("mqtt");
    var util = require("util");
    var events = require("events");
    var isUtf8 = require('is-utf8');

    function matchTopic(ts,t) {
        if (ts == "#") {
            return true;
        }
        var re = new RegExp("^"+ts.replace(/([\[\]\?\(\)\\\\$\^\*\.|])/g,"\\$1").replace(/\+/g,"[^/]+").replace(/\/#$/,"(\/.*)?")+"$");
        return re.test(t);
    }

    function MQTTBrokerNode(n) {
        RED.nodes.createNode(this,n);

        // Configuration options passed by Node Red
        this.brokerHost = n.broker_host;
        this.brokerProtocol = n.broker_protocol;
        this.port = n.port;
        this.clientid = n.clientid;
        this.disablecertauth = n.disablecertauth;
        this.compatmode = n.compatmode;
        this.mqttkeepalive = n.mqttkeepalive;

        // Config node state
        this.brokerurl = "";
        this.connected = false;
        this.connecting = false;
        this.usecount = 0;
        this.logdisconnect = true;
        this.options = {};
        this.queue = [];
        this.subscriptions = {};

        events.EventEmitter.call(this);
        this.setMaxListeners(0);

        if (this.credentials) {
            this.username = this.credentials.user;
            this.password = this.credentials.password;
        }

        // If the config node is missing certain options (it was probably deployed prior to an update to the node code),
        // select/generate sensible options for the new fields
        if (typeof this.compatmode === 'undefined'){
            this.compatmode = true;
        }
        if (typeof this.disablecertauth === 'undefined'){
            this.disablecertauth = false;
        }
        if (typeof this.mqttkeepalive === 'undefined'){
            this.mqttkeepalive = 15;
        }

        // Create the URL to pass in to the MQTT.js library
        if (this.brokerurl == "") {
            if (this.brokerHost != "") {
                this.brokerurl = this.brokerProtocol+"://"+this.brokerHost+":"+this.port;
            } else {
                this.brokerurl = this.brokerProtocol+"://"+"localhost"+":"+this.port;
            }
        }

        // Build options for passing to the MQTT.js API
        this.options.clientId = this.clientid || 'mqtt_' + (1+Math.random()*4294967295).toString(16);
        this.options.username = this.username;
        this.options.password = this.password;
        this.options.keepalive = this.mqttkeepalive;
        this.options.reconnectPeriod = 5000;
        if (this.compatmode == "true" || this.compatmode === true){
            this.log('Using compatibility mode for non-MQTT v3.1.1 brokers');
            this.options.protocolId = 'MQIsdp';
            this.options.protocolVersion = 3;
        }
        if (this.disablecertauth == "true" || this.disablecertauth === true) {
            this.log(' Warning: Certificate checking is disabled for this connection');
            this.options.rejectUnauthorized = false;
        } else {
            this.options.rejectUnauthorized = true;
        }

        // Define functions called by MQTT in and out nodes
        var node = this;
        this.register = function(){
            node.usecount += 1;
        };

        this.deregister = function(){
            node.usecount -= 1;
            if (node.usecount == 0) {
                node.client.end();
            }
        };

        this.connect = function () {
            if (!node.connected && !node.connecting) {
                node.connecting = true;
                node.client = mqtt.connect(node.brokerurl ,node.options);

                // Register successful connect or reconnect handler
                node.client.on('connect', function () {
                    node.connected = true;
                    node.logdisconnect = true;
                    node.log("Connected to broker: "+(node.clientid?node.clientid+"@":"")+node.brokerurl);
                    node.emit('connected');

                    // Remove any existing listeners before resubscribing to avoid duplicates in the event of a re-connection
                    node.client.removeAllListeners('message');

                    // Re-subscribe to stored topics
                    for (var s in node.subscriptions) {
                        var topic = s;
                        var qos = 0;
                        for (var r in node.subscriptions[s]) {
                            qos = Math.max(qos,node.subscriptions[s][r].qos);
                            node.client.on('message',node.subscriptions[s][r].handler);
                        }
                        var options = {qos: qos};
                        node.client.subscribe(topic, options);
                    }

                    // Send any queued messages
                    while(node.queue.length) {
                        var msg = node.queue.shift();
                        //console.log(msg);
                        node.publish(msg);
                    }
                });

                // Register disconnect handlers
                node.client.on('close', function () {
                    if (node.connected && node.logdisconnect ) {
                        node.connected = false;
                        node.logdisconnect = false;
                        node.log("Disconnected from broker: "+(node.clientid?node.clientid+"@":"")+node.brokerurl);
                        node.emit('disconnected');
                    }
                });

                node.client.on('offline', function () {
                    if (node.connected && node.logdisconnect ) {
                        node.connected = false;
                        node.logdisconnect = false;
                        node.log("Disconnected from broker: "+(node.clientid?node.clientid+"@":"")+node.brokerurl);
                        node.emit('disconnected');
                    }
                });

                // Register connect error handler
                node.client.on('error', function (error) {
                    node.log("" + error);
                    if (node.connecting) {
                        node.client.end();
                        node.connecting = false;
                    }
                });
            }
        };

        this.subscribe = function (topic,qos,callback,ref) {
            ref = ref||0;
            node.subscriptions[topic] = node.subscriptions[topic]||{};
            var sub = {
                topic:topic,
                qos:qos,
                handler:function(mtopic,mpayload, mpacket) {
                    if (matchTopic(topic,mtopic)) {
                        callback(mtopic,mpayload, mpacket);
                    }
                },
                ref: ref
            };
            node.subscriptions[topic][ref] = sub;
            if (node.connected) {
                node.client.on('message',sub.handler);
                var options = {};
                options.qos = qos;
                node.client.subscribe(topic, options);
            }
        };

        this.unsubscribe = function (topic, ref) {
            ref = ref||0;
            var sub = node.subscriptions[topic];
            if (sub) {
                if (sub[ref]) {
                    node.client.removeListener('message',sub[ref].handler);
                    delete sub[ref];
                }
                if (Object.keys(sub).length == 0) {
                    delete node.subscriptions[topic];
                    if (node.connected){
                        node.client.unsubscribe(topic);
                    }
                }
            }
        };

        this.publish = function (msg) {
            if (node.connected) {
                if (!Buffer.isBuffer(msg.payload)) {
                    if (typeof msg.payload === "object") {
                        msg.payload = JSON.stringify(msg.payload);
                    } else if (typeof msg.payload !== "string") {
                        msg.payload = "" + msg.payload;
                    }
                }

                var options = {
                    qos: msg.qos || 0,
                    retain: msg.retain || false
                };
                node.client.publish(msg.topic, msg.payload, options, function (err){return});
            } else {
                if (!node.connecting) {
                    node.connect();
                }
                node.queue.push(msg);
            }
        };

        this.on('close', function(closecomplete) {
            if (this.connected) {
                this.on('disconnected', function() {
                    closecomplete();
                });
                this.client.end();
            } else {
                closecomplete();
            }
        });

    }
    util.inherits(MQTTBrokerNode, events.EventEmitter);

    RED.nodes.registerType("mqttadv-broker",MQTTBrokerNode,{
        credentials: {
            user: {type:"text"},
            password: {type: "password"}
        }
    });

    function MQTTInNode(n) {
        RED.nodes.createNode(this,n);
        this.topic = n.topic;
        this.broker = n.broker;
        this.brokerConn = RED.nodes.getNode(this.broker);
        if (this.brokerConn) {
            this.status({fill:"red",shape:"ring",text:"disconnected"});
            var node = this;
            node.brokerConn.register();
            if (this.topic) {
                this.brokerConn.subscribe(this.topic,2,function(topic,payload,packet) {
                    if (isUtf8(payload)) { payload = payload.toString(); }
                    var msg = {topic:topic,payload:payload, qos: packet.qos, retain: packet.retain};
                    if ((node.brokerConn.broker === "localhost")||(node.brokerConn.broker === "127.0.0.1")) {
                        msg._topic = topic;
                    }
                    node.send(msg);
                }, this.id);
                this.brokerConn.on("disconnected",function() {
                    node.status({fill:"red",shape:"ring",text:"disconnected"});
                });
                this.brokerConn.on("connected",function() {
                    node.status({fill:"green",shape:"dot",text:"connected"});
                });
                if (this.brokerConn.connected) {
                    node.status({fill:"green",shape:"dot",text:"connected"});
                } else {
                    this.brokerConn.connect();
                }
            }
            else {
                this.error("topic not defined");
            }
        } else {
            this.error("missing broker configuration");
        }
        this.on('close', function() {
            if (this.brokerConn) {
                this.brokerConn.unsubscribe(this.topic,this.id);
                node.brokerConn.deregister();
            }
        });
    }
    RED.nodes.registerType("mqttadv in",MQTTInNode);

    function MQTTOutNode(n) {
        RED.nodes.createNode(this,n);
        this.topic = n.topic;
        this.qos = n.qos || null;
        this.retain = n.retain;
        this.broker = n.broker;
        this.brokerConn = RED.nodes.getNode(this.broker);

        if (this.brokerConn) {
            this.status({fill:"red",shape:"ring",text:"disconnected"});
            var node = this;
            node.brokerConn.register();
            this.on("input",function(msg) {
                if (msg.qos) {
                    msg.qos = parseInt(msg.qos);
                    if ((msg.qos !== 0) && (msg.qos !== 1) && (msg.qos !== 2)) {
                        msg.qos = null;
                    }
                }
                msg.qos = Number(node.qos || msg.qos || 0);
                msg.retain = node.retain || msg.retain || false;
                msg.retain = ((msg.retain === true) || (msg.retain === "true")) || false;
                if (node.topic) {
                    msg.topic = node.topic;
                }
                if ( msg.hasOwnProperty("payload")) {
                    if (msg.hasOwnProperty("topic") && (typeof msg.topic === "string") && (msg.topic !== "")) { // topic must exist
                        this.brokerConn.publish(msg);  // send the message
                    }
                    else { node.warn("Invalid topic specified"); }
                }
            });
            this.brokerConn.on("disconnected",function() {
                node.status({fill:"red",shape:"ring",text:"disconnected"});
            });
            this.brokerConn.on("connected",function() {
                node.status({fill:"green",shape:"dot",text:"connected"});
            });
            if (this.brokerConn.connected) {
                node.status({fill:"green",shape:"dot",text:"connected"});
            } else {
                this.brokerConn.connect();
            }
        } else {
            this.error("missing broker configuration");
        }
        this.on('close', function() {
            node.brokerConn.deregister();
        });
    }
    RED.nodes.registerType("mqttadv out",MQTTOutNode);
};
