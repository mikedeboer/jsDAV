/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax.org>
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var Http  = require("http"),
    jsDAV = require("./../lib/jsdav");

jsDAV.debugMode = true;

var server = Http.createServer(function(req, resp) {
    console.log("Incoming request in other handler...");
});

server.listen(8080, "127.0.0.1");

jsDAV.mount({
    node: __dirname + "/assets",
    mount: "test",
    server: server
});
