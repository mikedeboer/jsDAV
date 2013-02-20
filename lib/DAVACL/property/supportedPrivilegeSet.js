/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_Property = require("./../../DAV/property");

var Xml = require("./../../shared/xml");

/**
 * SupportedPrivilegeSet property
 *
 * This property encodes the {DAV:}supported-privilege-set property, as defined
 * in rfc3744. Please consult the rfc for details about it's structure.
 *
 * This class expects a structure like the one given from
 * jsDAVACL_Plugin.getSupportedPrivilegeSet as the argument in its
 * constructor.
 */
var jsDAV_SupportedPrivilegeSet = module.exports = jsDAV_Property.extend({
    /**
     * privileges
     *
     * @var Object
     */
    privileges: null,

    /**
     * Constructor
     *
     * @param {Object} privileges
     */
    initialize: function(privileges) {
        this.privileges = privileges;
    },

    /**
     * Serializes the property into a domdocument.
     *
     * @param jsDAV_Handler handler
     * @param {String} strXml
     * @return String
     */
    serialize: function(handler, strXml) {
        return strXml + this.serializePriv(this.privileges);
    },

    /**
     * Serializes a property
     *
     * This is a recursive function.
     *
     * @param {Object} privilege
     * @return String
     */
    serializePriv: function(privilege) {
        var aXml = ["<d:supported-privilege><d:privilege>"];
        var privParts = privilege.privilege.match(/^\{([^}]*)\}(.*)/);
        aXml.push("<d:" + privParts[2] + "/></d:privilege>");

        if (privilege.abstract)
            aXml.push("<d:abstract/>");

        if (privilege.description) {
            aXml.push("<d:description>" + Xml.escapeXml(privilege.description) +
                "</d:description>");
        }

        if (privilege.aggregates && privilege.aggregates.length) {
            for (var i = 0, l = privilege.aggregates.length; i < l; ++i)
                aXml.push(this.serializePriv(privilege.aggregates[i]));
        }
        return aXml.join("") + "</d:supported-privilege>";
    }
});
