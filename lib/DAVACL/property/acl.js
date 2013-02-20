/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_Property = require("./../../DAV/property");
var jsDAVACL_Principal = require("./principal");

var Exc = require("./../../shared/exceptions");
var Xml = require("./../../shared/xml");

/**
 * This class represents the {DAV:}acl property
 */
var jsDAV_Acl = module.exports = jsDAV_Property.extend({

    /**
     * List of privileges
     *
     * @var array
     */
    privileges: [],

    /**
     * Whether or not the server base url is required to be prefixed when
     * serializing the property.
     *
     * @var boolean
     */
    prefixBaseUrl: true,

    /**
     * Constructor
     *
     * This object requires a structure similar to the return value from
     * jsDAVACL_Plugin#getACL().
     *
     * Each privilege is a an {Array} with at least a 'privilege' property, and a
     * 'principal' property. A privilege may have a 'protected' property as
     * well.
     *
     * The prefixBaseUrl should be set to false, if the supplied principal urls
     * are already full urls. If this is kept to true, the servers base url
     * will automatically be prefixed.
     *
     * @param bool prefixBaseUrl
     * @param {Array} privileges
     */
    initialize: function(privileges, prefixBaseUrl) {
        this.privileges = privileges;
        this.prefixBaseUrl = typeof prefixBaseUrl == "boolean" ? prefixBaseUrl : true;
    },

    /**
     * Returns the list of privileges for this property
     *
     * @return array
     */
    getPrivileges: function() {
        return this.privileges;
    },

    /**
     * Serializes the property into a DOMElement
     *
     * @param jsDAV_Handler
     * @param DOMElement node
     * @return void
     */
    serialize: function(handler, strXml) {
        var aXml = [];
        for (var i = 0, l = this.privileges.length; i < l; ++i)
            aXml.push(this.serializeAce(this.privileges[i], handler));
        return strXml + aXml.join("");
    },

    /**
     * Unserializes the {DAV:}acl xml element.
     *
     * @param DOMElement dom
     * @return Acl
     */
    unserialize: function(dom) {
        var privileges = [];
        var xaces = dom.getElementsByTagNameNS("DAV:", "ace");
        var xace, principal, protect, grants, grant, xprivs, xpriv, privilegeName, childNode, j, l2, k, l3, t;
        for (var i = 0, l = xaces.length; i < l; ++i) {
            xace = xaces[i];
            principal = xace.getElementsByTagNameNS("DAV:", "principal");
            if (principal.length !== 1)
                throw new Exc.BadRequest("Each {DAV:}ace element must have one {DAV:}principal element");

            principal = new jsDAVACL_Principal().unserialize(principal[0]);

            switch (principal.getType()) {
                case jsDAVACL_Principal.HREF :
                    principal = principal.getHref();
                    break;
                case jsDAVACL_Principal.AUTHENTICATED :
                    principal = "{DAV:}authenticated";
                    break;
                case jsDAVACL_Principal.UNAUTHENTICATED :
                    principal = "{DAV:}unauthenticated";
                    break;
                case jsDAVACL_Principal.ALL :
                    principal = "{DAV:}all";
                    break;
            }

            protect = false;

            if (xace.getElementsByTagNameNS("DAV:", "protected").length > 0)
                protect = true;

            grants = xace.getElementsByTagNameNS("DAV:", "grant");
            if (grants.length < 1)
                throw new Exc.NotImplemented("Every {DAV:}ace element must have a {DAV:}grant element. {DAV:}deny is not yet supported");

            grant = grants[0];

            xprivs = grant.getElementsByTagNameNS("DAV:", "privilege");
            for (j = 0, l2 = xprivs.length; j < l2; ++j) {
                xpriv = xprivs[j];
                privilegeName = null;

                for (k = 0, l3 = xpriv.childNodes.length; k < l3; ++k) {
                    childNode = xpriv.childNodes[k];
                    if (t = Xml.toClarkNotation(childNode)) {
                        privilegeName = t;
                        break;
                    }
                }
                if (!privilegeName)
                    throw new Exc.BadRequest("{DAV:}privilege elements must have a privilege element contained within them.");

                privileges.push({
                    "principal": principal,
                    "protected": protect,
                    "privilege": privilegeName,
                });
            }
        }
        return jsDAV_Acl.new(privileges);
    },

    /**
     * Serializes a single access control entry.
     *
     * @param {Object} ace
     * @param jsDAV_Handler handler
     * @return void
     */
    serializeAce: function(ace, handler) {
        var aXml = ["<d:ace>", "<d:principal>"];

        switch(ace.principal) {
            case "{DAV:}authenticated" :
                aXml.push("<d:authenticated/>");
                break;
            case "{DAV:}unauthenticated" :
                aXml.push("<d:unauthenticated/>");
                break;
            case "{DAV:}all" :
                aXml.push("<d:all/>");
                break;
            default:
                aXml.push("<d:href>", (this.prefixBaseUrl ? handler.server.getBaseUri() : "") + ace.principal + "/", "</d:href>");
        }

        aXml.push("</d:principal><d:grant>");
        var privParts = ace.privilege.match(/^\{([^}]*)\}(.*)/);
        aXml.push("<d:privilege>", "<d:" + privParts[2] + "/>", "</d:privilege>", "</d:grant>");
        if (ace["protected"])
            aXml.push("<d:protected/>");
        // close all elements:
        return aXml.join("") + "</d:ace>";
    }
});
