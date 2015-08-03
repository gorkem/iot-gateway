
var http = require('http');
var express = require("express");
var RED = require("node-red");

var manager = {

    start: function () {

        // Create an Express app
        var app = express();
        // Add a simple route for static content served from 'public'
        app.use("/", express.static("public"));
        // Create a server
        var server = http.createServer(app);
        // Create the settings object - see default settings.js file for other options
        var settings = {
            httpAdminRoot: "/red",
            userDir: "/Users/gercan/.nodered",
            nodesDir: "/Users/gercan/workspaces/iot-gateway/node-red/nodes",
            functionGlobalContext: {},
            verbose: true,
            logging: {
                console: {
                    // Level of logging to be recorded. Options are:
                    // fatal - only those errors which make the application unusable should be recorded
                    // error - record errors which are deemed fatal for a particular request + fatal errors
                    // warn - record problems which are non fatal + errors + fatal errors
                    // info - record information about the general running of the application + warn + error + fatal errors
                    // debug - record information which is more verbose than info + info + warn + error + fatal errors
                    // trace - record very detailed logging + debug + info + warn + error + fatal errors
                    level: "trace",

                    // Whether or not to include metric events in the log output
                    metrics: false
                }
            }
        };
        // Initialise the runtime with a server and settings
        RED.init(server, settings);
        // Serve the editor UI from /red
        app.use(settings.httpAdminRoot, RED.httpAdmin);
        server.listen(8000);
        // Start the runtime
        RED.start();
    }
};

module.exports = manager;
