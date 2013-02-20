/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_Property = require("./../../DAV/property");

/**
 * CurrentUserPrivilegeSet
 *
 * This class represents the current-user-privilege-set property. When
 * requested, it contain all the privileges a user has on a specific node.
 */
var jsDAV_CurrentUserPrivilegeSet = module.exports = jsDAV_Property.extend({
    /**
     * List of privileges
     *
     * @var array
     */
    privileges: [],

    /**
     * Creates the object
     *
     * Pass the privileges in clark-notation
     *
     * @param {Array} privileges
     */
    initialize: function(privileges) {
        this.privileges = privileges;
    },

    /**
     * Serializes the property in the DOM
     *
     * @param jsDAV_Handler handler
     * @param {String} strXml
     * @return String
     */
    serialize: function(handler, strXml) {
        var aXml = [];
        for (var i = 0, l = this.privileges.length; i < l; ++i)
            aXml.push(this.serializePriv(this.privileges[i]));
        return strXml + aXml.join("");
    },

    /**
     * Serializes one privilege
     *
     * @param {String} privName
     * @return String
     */
    serializePriv: function(privName) {
        var privParts = privName.match(/^\{([^}]*)\}(.*)/);
        return "<d:privilege><d:" + privParts[2] + "/></d:privilege>";
    }
});
