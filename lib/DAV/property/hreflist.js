/**
 * HrefList property
 *
 * This property contains multiple {DAV:}href elements, each containing a url.
 *
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Tri Tech Computers Ltd. <info AT tri-tech DOT com>
 * @author James Emerton <james AT tri-tech DOT com>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV                = require("./../../jsdav");
var jsDAV_Property = require("./../property").jsDAV_Property;
var jsDAV_Property_Href = require("./href").jsDAV_Property_Href;

function jsDAV_Property_HrefList(hrefs, autoPrefix) {
    this.hrefs = hrefs;
    this.autoPrefix = autoPrefix;
}

(function() {
    /**
     * Returns the uris
     *
     * @return array
     */
    this.getHrefs = function() {
        return this.hrefs;
    }

    /**
     * Serializes this property.
     *
     * It will additionally prepend the href property with the server's base uri.
     *
     * @param Sabre_DAV_Server $server
     * @param DOMElement $dom
     * @return void
     */
    this.serialize = function(handler, xml) {
        var propPrefix = handler.xmlNamespaces["DAV:"];
        var parts = []
        for(var i=0; i<this.hrefs.length; ++i) {
            parts.push("<"+propPrefix+":href>" +
                (this.autoPrefix ? handler.server.getBaseUri() : "") +
                this.hrefs[i] + "</"+propPrefix+":href>");
        }

        return xml + parts.join('');
    }

    /**
     * Unserializes this property from a DOM Element
     *
     * This method returns an instance of this class.
     * It will only decode {DAV:}href values.
     *
     * @param DOMElement $dom
     * @return Sabre_DAV_Property_Href
     */
    this.unserialize = function(dom) {
        var hrefs = [];
        var children = dom.childNodes();
        for(var i=0; i<children.length; ++i) {
            if (Util.toClarkNotation(children[i])==='{DAV:}href')
                hrefs.push(children[i].textContent);
        }

        return new jsDAV_Property_HrefList(hrefs, false);
    }
}).call(jsDAV_Property_HrefList.prototype = new jsDAV_Property());

exports.jsDAV_Property_HrefList = jsDAV_Property_HrefList;
