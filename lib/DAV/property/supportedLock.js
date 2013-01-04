/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_Property = require("./../property");

var jsDAV_Property_SupportedLock = module.exports = jsDAV_Property.extend({
    initialize: function(supportsLocks) {
        this.supportsLocks = supportsLocks || false;
    },

    /**
     * serialize
     *
     * @param {jsDAV_Server} server
     * @param {String}       prop
     * @return void
     */
    serialize: function(handler, dom) {
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
    }
});
