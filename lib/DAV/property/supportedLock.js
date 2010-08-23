/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV          = require("./../../jsdav"),
    jsDAV_Property = require("./../property").jsDAV_Property;

function jsDAV_Property_SupportedLock(supportsLocks) {
    this.supportsLocks = supportsLocks || false;
}

exports.jsDAV_Property_SupportedLock = jsDAV_Property_SupportedLock;

(function() {
    this.REGBASE = this.REGBASE | jsDAV.__PROP_SUPPORTEDLOCK__;

    /**
     * serialize
     *
     * @param {jsDAV_Server} server
     * @param {String}       prop
     * @return void
     */
    this.serialize = function(server, prop) {
        if (!this.supportsLocks)
            return "";

        return prop + ">";
                    + "<d:lockentry>"
                    +    "<d:lockscope><d:exclusive/></d:lockscope>"
                    +    "<d:locktype><d:write/></d:locktype>"
                    + "</d:lockentry>"
                    + "<d:lockentry>"
                    +    "<d:lockscope><d:shared/></d:lockscope>"
                    +    "<d:locktype><d:write/></d:locktype>"
                    + "</d:lockentry>";
        //frag.appendXML('<d:lockentry><d:lockscope><d:exclusive /></d:lockscope><d:locktype><d:write /></d:locktype></d:lockentry>');
        //frag.appendXML('<d:lockentry><d:lockscope><d:shared /></d:lockscope><d:locktype><d:write /></d:locktype></d:lockentry>');
    };
}).call(jsDAV_Property_SupportedLock.prototype = new jsDAV.jsDAV_Property());
