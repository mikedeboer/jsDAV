/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var Sys   = require("sys"),
    Http  = require("http"),
    jsDAV = require("./../lib/jsdav");

jsDAV.debugMode = true;

var server = Http.createServer(function(req, resp) {
    Sys.puts("Incoming request in other handler...");
});

server.listen(8080, "127.0.0.1");

jsDAV.mount({
    path: __dirname + "/assets",
    mount: "test",
    server: server
});
