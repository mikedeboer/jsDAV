
var jsDAV = require('./../lib/jsdav');
//jsDAV.debugMode = true;

var Util = require("./../lib/DAV/util");

var jsDAV_iCollection = require("./../lib/DAV/iCollection").jsDAV_iCollection;
var jsDav_iProperties = require("./../lib/DAV/iProperties").jsDAV_iProperties;

var jsDAV_SimpleDirectory = require("./../lib/DAV/simpleDirectory").jsDAV_SimpleDirectory;
var jsDAV_Directory   = require("./../lib/DAV/directory").jsDAV_Directory;
var jsDAV_ServerPlugin = require("./../lib/DAV/plugin").jsDAV_ServerPlugin;
var jsDAV_Property = require("./../lib/DAV/property").jsDAV_Property;

var jsDAV_iPrincipalBackend = require("./../lib/DAVACL/iPrincipalBackend").jsDAV_iPrincipalBackend;
var jsDAV_PrincipalCollection = require("./../lib/DAVACL/principals").jsDAV_PrincipalCollection;

var jsDAV_Auth_Backend_AbstractDigest = require("./../lib/DAV/plugins/auth/abstractDigest");
var jsDAV_DAVACL_Plugin = require("./../lib/DAVACL/plugin");
var jsDAV_CalDAV_Plugin = require("./../lib/CalDAV/plugin").jsDAV_CalDAV_Plugin;


////////////////////

function Test_PrincipalBackend() { }

(function() {
    this.principals = [
        {
            'uri': 'principals/admin'
        }
    ];

    this.getPrincipalsByPrefix = function(prefixPath, callback) {
        callback(null, this.principals);
    }

    this.getPrincipalByPath = function(path, callback) {
        for(var i=0; i<this.principals.length; ++i)
            if(this.principals[i]['uri'] == path)
                return callback(null, this.principals[i]);

        callback();
    }

    this.searchPrincipals = function(prefixPath, searchProperties, callback) {
        callback();
    }

    this.getGroupMemberSet = function(principal, callback) {
        callback();
    }

    this.getGroupMembership = function(principal, callback) {
        callback();
    }

    this.setGroupMemberSet = function(principal, members, callback) {
        callback();
    }
}).call(Test_PrincipalBackend.prototype = new jsDAV_iPrincipalBackend());

////////////////////

function Test_Auth_Backend() { }

(function() {
    this.getDigestHash = function(realm, username, cbdighash) {
        if(username == 'admin')
            cbdighash(null, Util.md5('admin:CalDAV Test Realm:admin'));
        else
            cbdighash(null, null);
    }
}).call(Test_Auth_Backend.prototype = new jsDAV_Auth_Backend_AbstractDigest());

////////////////////

var root = new jsDAV_SimpleDirectory('root', [
    new jsDAV_PrincipalCollection(new Test_PrincipalBackend(), "principals")
]);

var server = jsDAV.createServer({
    node: root,
    standalone: true,
    realm: "CalDAV Test Realm",
    authBackend: new Test_Auth_Backend()
});

server.plugins['davacl'] = jsDAV_DAVACL_Plugin;
server.plugins['caldav'] = jsDAV_CalDAV_Plugin;

