/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV                = require("./../../jsdav");
var jsDAV_Property_iHref = require("./iHref").jsDAV_Property_iHref;

var Util                 = require("./../util");

function jsDAV_Property_Href(href, autoPrefix) {
    this.href       = href;
    this.autoPrefix = typeof autoPrefix == "boolean" ? autoPrefix : true;
}

exports.jsDAV_Property_Href = jsDAV_Property_Href;

(function() {
    this.REGBASE = this.REGBASE | jsDAV.__PROP_HREF__;

    /**
     * Returns the uri
     *
     * @return string
     */
    this.getHref = function() {
        return this.href;
    };

    /**
     * Serializes this property.
     *
     * It will additionally prepend the href property with the server's base uri.
     *
     * @param Sabre_DAV_Server server
     * @param DOMElement dom
     * @return void
     */
    this.serialize = function(handler, dom) {
        var propPrefix = handler.xmlNamespaces["DAV:"];
        var href = Util.escapeXml((this.autoPrefix ? handler.server.getBaseUri() : "") + this.href);
        return dom + "<" + propPrefix + ":href>" + href + "</" + propPrefix + ":href>";
    };

    /**
     * Unserializes this property from a DOM Element
     *
     * This method returns an instance of this class.
     * It will only decode {DAV:}href values. For non-compatible elements null will be returned.
     *
     * @param {DOMElement} dom
     * @return jsDAV_Property_Href
     */
    this.unserialize = function(dom) {
        if (Util.toClarkNotation(dom.firstChild) === "{DAV:}href") {
            return new jsDAV_Property_Href(dom.firstChild.textContent, false);
        }
    };
}).call(jsDAV_Property_Href.prototype = new jsDAV_Property_iHref());
