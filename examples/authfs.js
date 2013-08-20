"use strict";

var jsDAV = require("./../lib/jsdav");
jsDAV.debugMode = true;

var jsDAV_Locks_Backend_FS = require("./../lib/DAV/plugins/locks/fs");
var authBackend = require("./../lib/DAV/plugins/auth/arango");
var authPlugin = require("./../lib/DAV/plugins/auth");
var Db = require("./../lib/shared/backends/arango");

Db.getConnection("http://127.0.0.1:8529/users", function(err, db) {
    if (err) throw err;

    var arangoDB = authBackend.new(db);

    jsDAV.createServer({
        node: __dirname + "/../test/assets",
        authBackend: arangoDB,
        locksBackend: jsDAV_Locks_Backend_FS.new(__dirname + "/../test/assets"),
        realm: "jsDAV",
        plugins: [authPlugin]
    }, 8000);
});