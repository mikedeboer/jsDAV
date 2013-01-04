/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_Property_iHref = require("./../interfaces/iHref");

var Util = require("./../../shared/util");

var jsDAV_Property_Href = module.exports = jsDAV_Property_iHref.extend({
    initialize: function(href, autoPrefix) {
        this.href       = href;
        this.autoPrefix = typeof autoPrefix == "boolean" ? autoPrefix : true;
    },

    /**
     * Returns the uri
     *
     * @return string
     */
    getHref: function() {
        return this.href;
    },

    /**
     * Serializes this property.
     *
     * It will additionally prepend the href property with the server's base uri.
     *
     * @param Sabre_DAV_Server server
     * @param DOMElement dom
     * @return void
     */
    serialize: function(handler, dom) {
        var propPrefix = handler.xmlNamespaces["DAV:"];
        var href = Util.escapeXml((this.autoPrefix ? handler.server.getBaseUri() : "") + this.href);
        return dom + "<" + propPrefix + ":href>" + href + "</" + propPrefix + ":href>";
    },

    /**
     * Unserializes this property from a DOM Element
     *
     * This method returns an instance of this class.
     * It will only decode {DAV:}href values. For non-compatible elements null will be returned.
     *
     * @param {DOMElement} dom
     * @return jsDAV_Property_Href
     */
    unserialize: function(dom) {
        if (Util.toClarkNotation(dom.firstChild) === "{DAV:}href") {
            return jsDAV_Property_Href.new(dom.firstChild.textContent, false);
        }
    }
});
