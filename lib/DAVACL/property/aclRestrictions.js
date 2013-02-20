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
 * AclRestrictions property
 *
 * This property represents {DAV:}acl-restrictions, as defined in RFC3744.
 */
var jsDAV_AclRestrictions = module.exports = jsDAV_Property.extend({
    /**
     * Serializes the property into a DOMElement
     *
     * @param jsDAV_Handler handler
     * @param {String} strXml
     * @return void
     */
    serialize: function(handler, strXml) {
        return strXml + "<d:grant-only/><d:no-invert/>";
    }
});
