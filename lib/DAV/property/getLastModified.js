var jsDAV          = require("./../../jsdav"),
    jsDAV_Property = require("./../property").jsDAV_Property;

function jsDAV_Property_GetLastModified(time) {
    this.time = (time instanceof Date) ? time : new Date(time);
    // Remember: Only UTC time!
}

exports.jsDAV_Property_GetLastModified = jsDAV_Property_GetLastModified;

(function() {
    this.REGBASE = this.REGBASE | jsDAV.__PROP_GETLASTMODIFIED__;

    this.serialize = function(server, prop) {
        return prop + " xmlns:b=\"urn:uuid:c2f41010-65b3-11d1-a29f-00aa00c14882/\""
                    + " b:dt=\"dateTime.rfc1123\">"
                    + this.time.format(Date.RFC1123);
    };

    /**
     * getTime 
     * 
     * @return {Date}
     */
    this.getTime = function() {
        return this.time;
    };
}).call(jsDAV_Property_GetLastModified.prototype = new jsDAV.jsDAV_Property());