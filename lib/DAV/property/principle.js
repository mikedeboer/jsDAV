/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_Property = require("./../property");

var Util  = require("./../../shared/util");
var Exc   = require("./../../shared/exceptions");

/**
 * Creates the property.
 * The 'type' argument must be one of the type constants defined in this class.
 * 'href' is only required for the HREF type.
 *
 * @param {Number} type
 * @param {String} href
 * @return {void}
 */
var jsDAV_Property_Principal = module.exports = jsDAV_Property.extend({

    /**
     * To specify a not-logged-in user, use the UNAUTHENTICTED principal
     */
    UNAUTHENTICATED: 1,

    /**
     * To specify any principal that is logged in, use AUTHENTICATED
     */
    AUTHENTICATED: 2,

    /**
     * Specific princpals can be specified with the HREF
     */
    HREF: 3,

    initialize: function(type, href) {
        this.type = type;

        if (!href)
            throw new Exc.jsDAV_Exception("The href argument must be specified for the HREF principal type.");
        this.href = href;
    },

    /**
     * Returns the principal type
     *
     * @return {Number}
     */
    getType: function() {
        return this.type;
    },

    /**
     * Returns the principal uri.
     *
     * @return {string}
     */
    getHref: function() {
        return this.href;
    },

    /**
     * Serializes the property into a DOMElement.
     *
     * @param {jsDAV_Server} server
     * @param {DOMElement}   dom
     * @return void
     */
    serialize: function(handler, dom) {
        var princPrefix = handler.xmlNamespaces["DAV:"];
        switch (this.type) {
            case jsDAV_Property_Principal.UNAUTHENTICATED :
                dom += "<" + princPrefix + ":unauthenticated/>";
            break;
            case jsDAV_Property_Principal.AUTHENTICATED :
                dom += "<" + princPrefix + ":authenticated/>";
            break;
            case jsDAV_Property_Principal.HREF :
                var href = Util.escapeXml(handler.server.getBaseUri() + this.href);
                dom += "<" + princPrefix + ":href>" + href + "</" + princPrefix + ":href>";
            break;
        }
        return dom;
    }
});
