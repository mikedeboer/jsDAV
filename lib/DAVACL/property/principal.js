/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_Property = require("./../../DAV/property");
var jsDAV_iHref = require("./../../DAV/interfaces/iHref");

var Exc = require("./../../shared/exceptions");
var Xml = require("./../../shared/xml");

/**
 * Principal property
 *
 * The principal property represents a principal from RFC3744 (ACL).
 * The property can be used to specify a principal or pseudo principals.
 */
var jsDAV_Principal = module.exports = jsDAV_Property.extend(jsDAV_iHref, {
    /**
     * To specify a not-logged-in user, use the UNAUTHENTICATED principal
     */
    UNAUTHENTICATED: 1,

    /**
     * To specify any principal that is logged in, use AUTHENTICATED
     */
    AUTHENTICATED: 2,

    /**
     * Specific principals can be specified with the HREF
     */
    HREF: 3,

    /**
     * Everybody, basically
     */
    ALL: 4,

    /**
     * Principal-type
     *
     * Must be one of the UNAUTHENTICATED, AUTHENTICATED or HREF constants.
     *
     * @var int
     */
    type: null,

    /**
     * Url to principal
     *
     * This value is only used for the HREF principal type.
     *
     * @var string
     */
    href: null,

    /**
     * Creates the property.
     *
     * The 'type' argument must be one of the type constants defined in this class.
     *
     * 'href' is only required for the HREF type.
     *
     * @param {Number} type
     * @param string|null href
     */
    initialize: function(type, href) {
        this.type = parseInt(type, 10);

        if (type === this.HREF && !href)
            throw new Exc.Exception("The href argument must be specified for the HREF principal type.");
        this.href = href;
    },

    /**
     * Returns the principal type
     *
     * @return int
     */
    getType: function() {
        return this.type;
    },

    /**
     * Returns the principal uri.
     *
     * @return string
     */
    getHref: function() {
        return this.href;
    },

    /**
     * Serializes the property into a DOMElement.
     *
     * @param jsDAV_Handler server
     * @param {String} strXml
     * @return void
     */
    serialize: function(handler, strXml) {
        var prefix = Xml.xmlNamespaces["DAV:"];

        switch (this.type) {
            case this.UNAUTHENTICATED:
                return strXml + "<" + prefix + ":unauthenticated/>";
            case this.AUTHENTICATED:
                return strXml + "<" + prefix + ":authenticated/>";
            case this.HREF:
                return strXml + "<" + prefix + ":href>" + handler.server.getBaseUri() +
                    this.href + "</" + prefix + ":href>";
        }
    },

    /**
     * Deserializes a DOM element into a property object.
     *
     * @param DOMElement dom
     * @return Principal
     */
    unserialize: function(dom) {
        var parent = dom.firstChild;
        while (!Xml.toClarkNotation(parent)) {
            parent = parent.nextSibling;
        }

        switch (Xml.toClarkNotation(parent)) {
            case "{DAV:}unauthenticated" :
                return jsDAV_Principal.new(this.UNAUTHENTICATED);
            case "{DAV:}authenticated" :
                return jsDAV_Principal.new(this.AUTHENTICATED);
            case "{DAV:}href":
                return jsDAV_Principal.new(this.HREF, parent.textContent);
            case "{DAV:}all":
                return jsDAV_Principal.new(this.ALL);
            default :
                throw new Exc.BadRequest("Unexpected element (" +
                    Xml.toClarkNotation(parent) + "). Could not deserialize");
        }
    }
});
