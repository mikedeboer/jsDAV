// Create a dummy server for testing jsDAV code
//
"use strict";



var events = require('events');
var util = require('util');

var Server = require('../lib/DAV/server').Server;
var jsDAV_SimpleDirectory = require('../lib/DAV/simpleDirectory').jsDAV_SimpleDirectory;
var jsDAV_Base = require('../lib/jsdav').jsDAV_Base;
var jsDAV_iFile = require("../lib/DAV/iFile").jsDAV_iFile;


// I just *know* someone has made this already, but I didn't find it
//  before I lost patience digging through a hundred libraries that
//  were generic mock libs or mocked out ClientRequest objects
function MockRequest(method, url, headers, data) {
    this.method = method;
    this.url = url;
    this.headers = {};
    for(var header in headers)
        this.headers[header.toLowerCase()] = headers[header];
}
util.inherits(MockRequest, events.EventEmitter);


function MockResponse(callback) {
    this.callback = callback;
    this.data = ''
    this.done = false;
}

MockResponse.prototype.writeHead = function(code, headers) {
    this.code = code;
    this.headers = headers;
}

MockResponse.prototype.end = function(data) {
    if(this.done)
        throw new Error("MockResponse.end() called twice; code under test sent two responses!");

    this.done = true;
    // Yes yes, strings only right now...
    this.data += data;

    this.callback(this.code, this.headers, this.data);
}


function TestServer(nodes) {
    this.root = new jsDAV_SimpleDirectory('root', nodes);

    this.server = new Server({
        node: this.root,
        standalone: false,
        server: true,
        mount: '/'
    });
}

TestServer.prototype.request = function(method, url, headers, data, callback) {
    if(data instanceof Function) {
        callback = data;
        data = undefined;
    }

    var req = new MockRequest(method, url, headers);
    var resp = new MockResponse(callback);

    this.server.exec(req, resp);

    if(data)
        req.emit('data', data);

    req.emit('end');
}


function TestFile(name, options) {
    this.name = name;
    for(var opt in options)
        this[opt] = options[opt];
}

(function() {
    this.implement(jsDAV_iFile);

    // iNode...
    this.getName = function() { return this.name; }
    this.setName = function(name, callback) {
        this.name = name;
        callback(null);
    }
    this.getLastModified = function(callback) { callback(null, this.last_modified); }


    // iFile...
    this.put = function(data, type, callback) {
        this.body = data;
        this.content_type = type;
        callback(null);
    }

    this.get            = function(callback) { callback(null, this.body); }
    this.getContentType = function(callback) { callback(null, this.content_type); }
    this.getETag        = function(callback) { callback(null, this.etag); }

}).call(TestFile.prototype = new jsDAV_Base());


exports.TestServer = TestServer;
exports.TestFile = TestFile;
