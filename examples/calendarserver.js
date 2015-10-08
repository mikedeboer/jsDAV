/*
 * @package jsDAV
 * @subpackage CalDAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

/*

Calendar/CalDAV server example

This server features CalDAV support

*/

// Database driver to use. 'redis' is the default, but feel free to use anything
// else supported by jsDAV
var DB_DRIVER = "redis";

var jsDAV = require("./../lib/jsdav");
jsDAV.debugMode = true;
var jsDAV_Auth_Backend = require("./../lib/DAV/plugins/auth/" + DB_DRIVER);
var jsDAVACL_PrincipalBackend = require("./../lib/DAVACL/backends/" + DB_DRIVER);
var jsCalDAV_Backend = require("./../lib/CalDAV/backends/" + DB_DRIVER);
// node classes:
var jsDAVACL_PrincipalCollection = require("./../lib/DAVACL/principalCollection");
var jsCalDAV_CalendarRoot = require("./../lib/CalDAV/calendarRoot");
// plugins:
var jsDAV_Auth_Plugin = require("./../lib/DAV/plugins/auth");
var jsDAV_Browser_Plugin = require("./../lib/DAV/plugins/browser");
var jsCalDAV_Plugin = require("./../lib/CalDAV/plugin");
var jsDAVACL_Plugin = require("./../lib/DAVACL/plugin");

var Db = require("./../lib/shared/backends/" + DB_DRIVER);
var DB_INIT = require("./data/addressbook/" + DB_DRIVER);

// Make sure this setting is turned on and reflect the root url for your WebDAV server.
// This can be for example the root / or a complete path to your server script
var baseUri = "/";

// Arguments to be passed to the function that establishes a connection with the db
var DB_ARGS = {};

// DB arguments for the mongo driver:
/*var DB_ARGS = {
    host: "localhost",
    db: "jsdav",
    port: 27017,
    //username: "", //optional, if both username and password are provided, authentication will be performed before returning connection
    //password: "" //see above
};
*/

// Database connection
Db.getConnection(DB_ARGS, function(err, db) {
    if (err)
        throw err;

    DB_INIT.init(db, false, function(err) {
        if (err)
            throw err;

        var authBackend = jsDAV_Auth_Backend.new(db);
        var principalBackend = jsDAVACL_PrincipalBackend.new(db);
        var caldavBackend = jsCalDAV_Backend.new(db);

        // Setting up the directory tree
        var nodes = [
            jsDAVACL_PrincipalCollection.new(principalBackend),
            jsCalDAV_CalendarRoot.new(principalBackend, caldavBackend)
        ];

        jsDAV.createServer({
            node: nodes,
            baseUri: baseUri,
            authBackend: authBackend,
            realm: "jsDAV",
            plugins: [jsDAV_Auth_Plugin, jsDAV_Browser_Plugin, jsCalDAV_Plugin, jsDAVACL_Plugin]
        }, 8000);

    });
});
