
var TestServer = require('./testserver').TestServer;
var util = require('util');
var dav_util = require('./../lib/DAV/util');
var Exc = require("./../lib/DAV/exceptions");

var jsDAV_DAVACL_Plugin = require("./../lib/DAVACL/plugin");
var jsDAV_CalDAV_Plugin = require("./../lib/CalDAV/plugin");
var jsDAV_PrincipalCollection = require("./../lib/DAVACL/principals").jsDAV_PrincipalCollection;
var jsDAV_CalDAV_CalendarRootNode = require("./../lib/CalDAV/calendarRootNode").jsDAV_CalDAV_CalendarRootNode;

var jsDAV_Auth_Backend_AbstractBasic = require("./../lib/DAV/plugins/auth/abstractBasic");
var jsDAV_iPrincipalBackend = require("./../lib/DAVACL/iPrincipalBackend").jsDAV_iPrincipalBackend;
var jsDAV_CalDAV_iBackend = require('./../lib/CalDAV/iCalDAVBackend').jsDAV_CalDAV_iBackend;


function TestAuthBackend(users) {
    this.users = users;
}

(function() {
    this.validateUserPass = function(username, password, callback) {
        callback(this.users[username] && this.users[username].password === password);
    }
}).call(TestAuthBackend.prototype = new jsDAV_Auth_Backend_AbstractBasic());




function TestPrincipalBackend(users) {
    this.users = {};
    for(var u in users) {
        this.users['principals/'+u] = {
            uri: 'principals/'+u
        };
    }
}

(function() {
    this.getPrincipalsByPrefix = function(prefixPath, callback) {
        callback(null, this.users);
    }

    this.getPrincipalByPath = function(path, callback) {
        callback(null, this.users[path]);
    }
}).call(TestPrincipalBackend.prototype = new jsDAV_iPrincipalBackend());




function TestCalendarBackend(users) {
    this.users = {};
    this.calendars = {};
    this.calendarData = {};

    for(var u in users) {
        var uuid = dav_util.uuid();
        this.users['principals/'+u] = uuid;
        this.calendars[uuid] = {
            id: uuid,
            name: 'calendar',
            uri: 'calendar',
            principaluri: 'principals/'+u
        };

        this.calendarData[uuid] = {};
    }
}

(function() {
    this.getCalendarsForUser = function(principalUri, callback) {
        var uuid = this.users[principalUri];
        callback(null, uuid && [this.calendars[uuid]]);
    }

    this.updateCalendar = function(calendarId, mutations, callback) {
        var cal = this.calendars[calendarId];
        if(cal === undefined) return callback(new Exc.jsDAV_Exception_FileNotFound("No such calendar"));

        for(var prop in mutations) {
            cal[prop] = mutations[prop];
        }
    }

    this.getCalendarObjects = function(calendarId, callback) {
        var objs = [];
        for(var k in this.calendarData[calendarId]) {
            var obj = this.calendarData[calendarId][k];
            obj.calendarid = calendarId;
            obj.uri = k;
            objs.push(obj);
        }
        callback(null, objs);
    }

    this.getCalendarObject = function(calendarId, objectUri, callback) {
        callback(null, this.calendarData[calendarId][objectUri]);
    }

    this.createCalendarObject = function(calendarId, objectUri, calendarData, callback) {
        this.calendarData[calendarId][objectUri] = {
            calendarid: calendarId,
            uri: objectUri,
            calendardata: calendarData,
            lastmodified: new Date()
        };
    }

    this.updateCalendarObject = function(calendarId, objectUri, calendarData, callback) {
        var obj = this.calendarData[calendarId][objectUri];
        obj.calendardata = calendarData;
        obj.lastmodified = new Date();
    }

    this.deleteCalendarObject = function(calendarId, objectUri, callback) {
        delete this.calendarData[calendarId][objectUri];
    }
}).call(TestCalendarBackend.prototype = new jsDAV_CalDAV_iBackend());




function CalDAVTestServer(options) {
    var principalBackend = new TestPrincipalBackend(options.users);
    var calendarBackend = new TestCalendarBackend(options.users);

    var nodes = [
        new jsDAV_PrincipalCollection(principalBackend, "principals"),
        new jsDAV_CalDAV_CalendarRootNode(principalBackend, calendarBackend)
    ];

    options = options || {};
    options.authBackend = options.authBackend || new TestAuthBackend(options.users);

    TestServer.call(this, nodes, options);

    this.server.plugins['davacl'] = jsDAV_DAVACL_Plugin;
    this.server.plugins['caldav'] = jsDAV_CalDAV_Plugin;
}
util.inherits(CalDAVTestServer, TestServer);

exports.CalDAVTestServer = CalDAVTestServer;
