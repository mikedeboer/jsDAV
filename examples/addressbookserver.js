/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax.org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

/*

Addressbook/CardDAV server example

This server features CardDAV support

*/

var jsDAV = require("./../lib/jsdav");
jsDAV.debugMode = true;
var jsDAV_Auth_Backend_Redis = require("./../lib/DAV/plugins/auth/redis");
var jsDAVACL_PrincipalBackend_Redis = require("./../lib/DAVACL/backends/redis");
var jsCardDAV_Backend_Redis = require("./../lib/CardDAV/backends/redis");
// node classes:
var jsDAVACL_PrincipalCollection = require("./../lib/DAVACL/principalCollection");
var jsCardDAV_AddressBookRoot = require("./../lib/CardDAV/addressBookRoot");
// plugins:
var jsDAV_Auth_Plugin = require("./../lib/DAV/plugins/auth");
var jsDAV_Browser_Plugin = require("./../lib/DAV/plugins/browser");
var jsCardDAV_Plugin = require("./../lib/CardDAV/plugin");
var jsDAVACL_Plugin = require("./../lib/DAVACL/plugin");

var Db = require("./../lib/shared/db");

// Database driver to use. 'redis' is the default, but feel free to use anything 
// else supported by jsDAV
var DB_DRIVER = "redis";
var DB_INIT = require("./data/addressbook/" + DB_DRIVER);
// Arguments to be passed to the function that establishes a connection with the db
var DB_ARGS = [];

// Database
var connFunc = DB_DRIVER + "Connection";
// A function like 'Db.redisConnection()' must be 
if (!Db[connFunc])
    throw "Uck! This database driver (" + DB_DRIVER + ") does not seem to be supported!";
var db = Db[connFunc].apply(Db, DB_ARGS);

// Make sure this setting is turned on and reflect the root url for your WebDAV server.
// This can be for example the root / or a complete path to your server script
var baseUri = "/";

// set it up for demo use:
DB_INIT.init(db, function(err) {
    if (err)
        throw(err);
    
    // Backends
    var authBackend = jsDAV_Auth_Backend_Redis.new(db);
    var principalBackend = jsDAVACL_PrincipalBackend_Redis.new(db);
    var carddavBackend = jsCardDAV_Backend_Redis.new(db);
    
    // Setting up the directory tree
    var nodes = [
        jsDAVACL_PrincipalCollection.new(principalBackend),
        jsCardDAV_AddressBookRoot.new(principalBackend, carddavBackend)
    ];
    
    jsDAV.createServer({
        node: nodes,
        baseUri: baseUri,
        authBackend: authBackend,
        realm: "jsDAV",
        plugins: [jsDAV_Auth_Plugin, jsDAV_Browser_Plugin, jsCardDAV_Plugin, jsDAVACL_Plugin]
    }, 8000);
});
