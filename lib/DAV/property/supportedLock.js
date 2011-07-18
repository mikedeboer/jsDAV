/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
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
    this.serialize = function(handler, dom) {
        if (!this.supportsLocks)
            return "";

        return dom + "<d:lockentry>"
                   +    "<d:lockscope><d:exclusive/></d:lockscope>"
                   +    "<d:locktype><d:write/></d:locktype>"
                   + "</d:lockentry>"
                   + "<d:lockentry>"
                   +    "<d:lockscope><d:shared/></d:lockscope>"
                   +    "<d:locktype><d:write/></d:locktype>"
                   + "</d:lockentry>";
        //frag.appendXML('<d:lockentry><d:lockscope><d:exclusive /></d:lockscope><d:locktype><d:write /></d:locktype></d:lockentry>');
        //frag.appendXML('<d:lockentry><d:lockscope><d:shared /></d:lockscope><d:locktype><d:write /></d:locktype></d:lockentry>');
        return dom;
    };
}).call(jsDAV_Property_SupportedLock.prototype = new jsDAV_Property());
