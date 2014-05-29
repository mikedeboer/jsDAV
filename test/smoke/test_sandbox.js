/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax.org>
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var Http  = require("http");
var Assert = require("assert");
var jsDAV = require("./../lib/jsdav");
var Util = require("./../lib/shared/util");

jsDAV.debugMode = true;

function done(err) {
    if (err)
        console.log("got error", err);
    process.exit();
}

var server = Http.createServer(function(req, resp) {
    console.log("Incoming request in other handler...");
});

var config = {
    host: "127.0.0.1",
    port: 8080
};

server.listen(config.port, config.host, function() {
    // request a resource outside of the mount dir
    Http.get(Util.extend({ path: "/test/blah" }, config), function(res) {
        Assert.equal(res.statusCode, 404);

        Http.get(Util.extend({ path: "/test/../../../../etc/passwd" }, config), function(res) {
            Assert.equal(res.statusCode, 403);

            Http.get(Util.extend({ path: "/test/1.txt" }, config), function(res) {
                Assert.equal(res.statusCode, 200);

                Http.get(Util.extend({ path: "/test/walk/dir1/1.txt" }, config), function(res) {
                    Assert.equal(res.statusCode, 200);

                    done();
                }).on("error", done);
            }).on("error", done);
        }).on("error", done);
    }).on("error", done);
});

jsDAV.mount({
    node: __dirname + "/assets",
    mount: "test",
    server: server
});
