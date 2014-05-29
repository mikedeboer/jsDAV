/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax.org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV = require("./../lib/jsdav");
var jsDAV_ServerPlugin = require("jsdav/lib/DAV/plugin").jsDAV_ServerPlugin;
var util = require("util");
var events = require("events");
var http = require("http");

jsDAV.debugMode = true;

// Invoked at bottom of file.
function main() {

    createInstance({
        mode: "slave",
        port: 8001
    });

    createInstance({
        mode: "master",
        port: 8002
    });

    makeSlavePutRequest();
}

function makeSlavePutRequest() {
    console.log("Make slave PUT request ...");
    var req = http.request({
        host: '127.0.0.1',
        port: 8001, // slave
        path: '/1.txt',
        method: 'PUT'
    }, function(res) {
        var data = "";
        res.on('data', function (chunk) {
            data += chunk.toString();
        });
        res.on('end', function () {
            console.log("... got status '" + res.statusCode + "' when PUTting to slave.");
        });
    });
    req.write("1");
    req.end();
}


function createInstance(options) {

    var filewatch = new Filewatch({
        mode: options.mode
    });

    filewatch.on("afterWrite", function(event) {
        console.log("Got JS DAV afterWrite for " + options.mode, event);
    });

    var davOptions = {
        node: __dirname + "/assets",
        path: __dirname + "/assets",
        mount: "/",
        plugins: ["auth", /*"browser", */"codesearch", "filelist", "filesearch", "locks", "mount", "temporaryfilefilter"],
        server: {},
        standalone: false
    };

    var davServer = jsDAV.mount(davOptions);
    davServer.mode = options.mode;
    davServer.plugins["filewatch"] = filewatch.getPlugin();

    http.createServer(function (req, res) {
        davServer.exec(req, res);
    }).listen(options.port);

    return davServer;
}


var Filewatch = function(options) {
    var self = this;

    var plugin = function(handler) {

        jsDAV_ServerPlugin.call(this, handler);

        handler.addEventListener("afterWriteContent", function(e, uri) {
console.log("afterWriteContent event for " + options.mode);
            self.emit("afterWrite", {
                file: "/" + uri
            });
            e.next();
        });
    }
    util.inherits(plugin, jsDAV_ServerPlugin);

    self.getPlugin = function() {
console.log("PLUGIN INSTANCE FOR " + options.mode);
        return plugin;
    }
};

util.inherits(Filewatch, events.EventEmitter);


main();

