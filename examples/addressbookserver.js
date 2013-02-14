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

// Make sure this setting is turned on and reflect the root url for your WebDAV server.
// This can be for example the root / or a complete path to your server script
var baseUri = "/";

// Database
var redis = Db.redisConnection();
// set it up for demo use:
redis.multi([
    ["FLUSHDB"],
    // create user admin. NOTE: if you change the realm to something other than 'jsDAV', 
    // you need to change the hash below here to: md5("<username>:<realm>:<password>").
    ["SET", "users/admin", "6838d8a7454372f68a6abffbdb58911c"],
    // create the initial ACL rules for user 'admin'
    ["HMSET", "principals/principals/admin", "email", "admin@example.org", "displayname", "Administrator"],
    ["HMSET", "principals/principals/admin/calendar-proxy-read", "email", "", "displayname", ""],
    ["HMSET", "principals/principals/admin/calendar-proxy-write", "email", "", "displayname", ""],
    // create the first addressbook
    ["SET", "addressbooks/ID", "1"],
    ["HMSET", "addressbooks/1", "principaluri", "principals/admin", "displayname", "default calendar", "uri", "default", "description", "", "ctag", "1"],
    ["HMSET", "addressbooks/principalUri", "principals/admin", "[1]"]
]).exec(function(err) {
    if (err)
        throw(err);
    
    // Backends
    var authBackend      = jsDAV_Auth_Backend_Redis.new(redis);
    var principalBackend = jsDAVACL_PrincipalBackend_Redis.new(redis);
    var carddavBackend   = jsCardDAV_Backend_Redis.new(redis);
    
    // Setting up the directory tree //
    var nodes = [
        jsDAVACL_PrincipalCollection.new(principalBackend),
        jsCardDAV_AddressBookRoot.new(principalBackend, carddavBackend),
    ];
    
    jsDAV.createServer({
        node: nodes,
        baseUri: baseUri,
        authBackend: authBackend,
        realm: "jsDAV",
        plugins: [jsDAV_Auth_Plugin, jsDAV_Browser_Plugin, jsCardDAV_Plugin, jsDAVACL_Plugin]
    }, 8000);
});
