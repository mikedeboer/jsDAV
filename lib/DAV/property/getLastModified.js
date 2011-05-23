/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV          = require("./../../jsdav"),
    jsDAV_Property = require("./../property").jsDAV_Property,
    
    Util           = require("./../util");

function jsDAV_Property_GetLastModified(time) {
    this.time = (time instanceof Date) ? time : new Date(time);
    // Remember: Only UTC time!
}

exports.jsDAV_Property_GetLastModified = jsDAV_Property_GetLastModified;

(function() {
    this.REGBASE = this.REGBASE | jsDAV.__PROP_GETLASTMODIFIED__;

    this.serialize = function(handler, lmDom) {
        // we need to add a namespace to the root node, so remove the last '>'
        lmDom = lmDom.substr(0, lmDom.lastIndexOf(">"));
        return lmDom + " xmlns:b=\"urn:uuid:c2f41010-65b3-11d1-a29f-00aa00c14882/\""
                     + " b:dt=\"dateTime.rfc1123\">"
                     + Util.dateFormat(this.time, Util.DATE_RFC1123);
    };

    /**
     * getTime 
     * 
     * @return {Date}
     */
    this.getTime = function() {
        return this.time;
    };
}).call(jsDAV_Property_GetLastModified.prototype = new jsDAV_Property());
