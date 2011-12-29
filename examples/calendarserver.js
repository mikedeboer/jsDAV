
var fs = require('fs');

var jsDAV = require('./../lib/jsdav');
jsDAV.debugMode = true;

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
var jsDAV_CalDAV_Plugin = require("./../lib/CalDAV/plugin");
var jsDAV_CalDAV_CalendarRootNode = require("./../lib/CalDAV/calendarRootNode").jsDAV_CalDAV_CalendarRootNode;
var jsDAV_CalDAV_iBackend = require('./../lib/CalDAV/iCalDAVBackend').jsDAV_CalDAV_iBackend;


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
        callback(null, []);
    }

    this.getGroupMembership = function(principal, callback) {
        callback(null, []);
    }

    this.setGroupMemberSet = function(principal, members, callback) {
        callback();
    }
}).call(Test_PrincipalBackend.prototype = new jsDAV_iPrincipalBackend());

////////////////////

function Test_CalDAV_Backend() {
    try {
        var data = JSON.parse(fs.readFileSync('calendar_data.json'));
        this.calendars = data.calendars;
        this.calendarData = data.calendarData;
        this.userCalendars = data.userCalendars;
    }
    catch(e) {
        // Use starting data...
    }
}

(function() {
    // All calendars indexed by ID
    this.calendars = {
        '02753F9A-4F10-4BC3-A546-03124715C2A9': {
            'name': 'calendar',
            'uri': 'calendar',
            'principaluri': 'principals/admin',

            '{DAV:}displayname': 'Test Calendar'
        }
    };

    this.calendarData = {
        '02753F9A-4F10-4BC3-A546-03124715C2A9': {}
    };

    // Calendars for each user
    this.userCalendars = {
        'principals/admin': [
            '02753F9A-4F10-4BC3-A546-03124715C2A9'
        ]
    }

    this.saveCalendar = function(callback) {
        // Save calendar data to a json file...
        var data = JSON.stringify({
            calendars: this.calendars,
            calendarData: this.calendarData,
            userCalendars: this.userCalendars
        });
        fs.writeFile('calendar_data.json', data, 'utf8', callback);
    }

    this.getCalendarsForUser = function(principalUri, callback) {
        console.log('getCalendarsForUser', principalUri);
        var cal = [];
        for(var i=0; i<this.userCalendars[principalUri].length; ++i) {
            var id = this.userCalendars[principalUri][i];
            var cdata = this.calendars[id];
            cdata.id = id;
            cal.push(cdata);
        }
        callback(null, cal);
    }

    this.createCalendar = function(principalUri, calendarUri, properties, callback) {
        callback();
    }

    this.deleteCalendar = function(calendarId, callback) {
        callback();
    }

    this.updateCalendar = function(calendarId, mutations, callback) {
        console.log('updateCalendar', calendarId, mutations);
        var cal = this.calendars[calendarId];
        if(cal === undefined) return callback(new Exc.jsDAV_Exception_FileNotFound("No such calendar"));

        for(var prop in mutations) {
            cal[prop] = mutations[prop];
        }

        this.saveCalendar(callback);
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
        console.log('createCalendarObject', calendarId, objectUri, calendarData);
        this.calendarData[calendarId][objectUri] = {
            calendarid: calendarId,
            uri: objectUri,
            calendardata: calendarData
        };
        this.saveCalendar(callback);
    }

    this.updateCalendarObject = function(calendarId, objectUri, calendarData, callback) {
        console.log('updateCalendarObject', calendarId, objectUri, calendarData);
        this.calendarData[calendarId][objectUri].calendardata = calendarData;
        this.saveCalendar(callback);
    }

    this.deleteCalendarObject = function(calendarId, objectUri, callback) {
        console.log('updateCalendarObject', calendarId, objectUri);
        delete this.calendarData[calendarId][objectUri];
        this.saveCalendar(callback);
    }
}).call(Test_CalDAV_Backend.prototype = new jsDAV_CalDAV_iBackend());

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

var principalBackend = new Test_PrincipalBackend();
var calendarBackend = new Test_CalDAV_Backend();

var root = new jsDAV_SimpleDirectory('root', [
    new jsDAV_PrincipalCollection(principalBackend, "principals"),
    new jsDAV_CalDAV_CalendarRootNode(principalBackend, calendarBackend)
]);

var server = jsDAV.createServer({
    node: root,
    standalone: true,
    realm: "CalDAV Test Realm",
    authBackend: new Test_Auth_Backend()
});

server.plugins['davacl'] = jsDAV_DAVACL_Plugin;
server.plugins['caldav'] = jsDAV_CalDAV_Plugin;

