
var jsDAV = require('./../lib/jsdav');
jsDAV.debugMode = true;

var jsDav_iProperties = require("./../lib/DAV/iProperties").jsDAV_iProperties;

var jsDAV_SimpleDirectory = require("./../lib/DAV/simpleDirectory").jsDAV_SimpleDirectory;
var jsDAV_Directory   = require("./../lib/DAV/directory").jsDAV_Directory;
var jsDAV_ServerPlugin = require("./../lib/DAV/plugin").jsDAV_ServerPlugin;
var jsDAV_Property = require("./../lib/DAV/property").jsDAV_Property;

var Exc = require("./../lib/DAV/exceptions");

////////////////////

function jsDAV_Property_CurrentUserPrincpal(user) {
    this.user = user;
}

(function() {
    this.serialize = function(handler, lmDom) {
        // TODO: Return a real value from this...
        return lmDom+'<unauthenticated/>'
    }
}).call(jsDAV_Property_CurrentUserPrincpal.prototype = new jsDAV_Property());

////////////////////

function jsDAV_Calendar() {
}

(function() {
    this.implement(jsDav_iProperties);

    /**
     * Returns a list of properties for this nodes.
     *
     * The properties list is a list of propertynames the client requested,
     * encoded in clark-notation {xmlnamespace}tagname
     *
     * If the array is empty, it means 'all properties' were requested.
     *
     * @param {Object} properties
     * @return void
     */
    this.getProperties = function(properties) {
        return {
            '{DAV:}current-user-principal': new jsDAV_Property_CurrentUserPrincpal()
        }
    }
}).call(jsDAV_Calendar.prototype = new jsDAV_Directory());


////////////////////

var root = new jsDAV_Calendar();
root._label = "CalDAV Test Node";

var server = jsDAV.createServer({
    node: root,
    standalone: true
});


////////////////////

function jsDAV_CalDAV_Plugin(handler) {
    this.handler = handler;
    this.initialize();
}

(function() {
    this.initialize = function() {
        this.handler.addEventListener("unknownMethod", this.unknownMethod.bind(this));
        this.handler.addEventListener("beforeMethod", this.beforeMethod.bind(this));
    }

    this.unknownMethod = function(e, method) {
        if(method == 'MKCALENDAR')
            this.httpMkcalendar(e);
        else
            e.next();
    }

    this.getFeatures = function() {
        return ['calendar-access'];
    }

    this.getHTTPMethods = function(uri, node) {
        return [];
    }

    this.beforeMethod = function(e, method) {
        var req = this.handler.httpRequest;
        // TODO: Test preconditions for PUT, MOVE and COPY:
        //   (CALDAV:supported-calendar-data)
        //   (CALDAV:valid-calendar-data)
        //   (CALDAV:valid-calendar-object-resource)
        //   (CALDAV:supported-calendar-component)
        //   (CALDAV:no-uid-conflict)
        //   (CALDAV:calendar-collection-location-ok)
        //   (CALDAV:max-resource-size)
        //   (CALDAV:min-date-time)
        //   (CALDAV:max-date-time)
        //   (CALDAV:max-instances)
        //   (CALDAV:max-attendees-per-instance)
        
        switch(method) {
            case "PUT":
                break;

            case "MOVE":
                break;

            case "COPY":
                break;
        }

        e.next(null);
    }

    this.httpMkcalendar = function(e) {
        // I put this here for completeness sake, but supporting MKCALENDAR
        // is impossible without making changes to http_parser and Node.js itself
        e.next(new Exc.jsDAV_Exception_Forbidden("MKCALENDAR is not supported"));
    }
}).call(jsDAV_CalDAV_Plugin.prototype = new jsDAV_ServerPlugin());


server.plugins['caldav'] = jsDAV_CalDAV_Plugin;
