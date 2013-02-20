/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_Property = require("./../property");

var Xml = require("./../../shared/xml");

var jsDAV_Property_HrefList = module.exports = jsDAV_Property.extend({

    /**
     * hrefs
     *
     * @var array
     */
    hrefs: null,

    /**
     * Automatically prefix the url with the server base directory
     *
     * @var bool
     */
    autoPrefix: true,

    /**
     * __construct
     *
     * @param {Array} hrefs
     * @param bool autoPrefix
     */
    initialize: function(hrefs, autoPrefix) {
        this.hrefs = hrefs;
        this.autoPrefix = typeof autoPrefix == "boolean" ? autoPrefix : true;
    },

    /**
     * Returns the uris
     *
     * @return array
     */
    getHrefs: function() {
        return this.hrefs;
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
        var propPrefix = Xml.xmlNamespaces["DAV:"];
        var autoPrefix = this.autoPrefix;
        var aXml = [];

        this.hrefs.forEach(function(href) {
            href = Xml.escapeXml((autoPrefix ? handler.server.getBaseUri() : "") + href);
            aXml.push("<" + propPrefix + ":href>" + href + "</" + propPrefix + ":href>");
        });
        return dom + aXml.join("");
    },

    /**
     * Unserializes this property from a DOM Element
     *
     * This method returns an instance of this class.
     * It will only decode {DAV:}href values.
     *
     * @param {DOMElement} dom
     * @return jsDAV_Property_HrefList
     */
    unserialize: function(dom) {
        var hrefs = [];
        for (var i = 0, l = dom.childNodes.length; i < l; ++i) {
            if (Xml.toClarkNotation(dom.childNodes[i]) === "{DAV:}href")
                hrefs.push(dom.childNodes[i].textContent);
        }

        return jsDAV_Property_HrefList.new(hrefs, false);
    }
});
