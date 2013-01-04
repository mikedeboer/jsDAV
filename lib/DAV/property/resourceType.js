/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_Handler = require("./../handler");
var jsDAV_Property = require("./../property");

var jsDAV_Property_ResourceType = module.exports = jsDAV_Property.extend({
    initialize: function(resourceType) {
        this.resourceType = (resourceType === jsDAV_Handler.NODE_FILE)
            ? null
            : (resourceType === jsDAV_Handler.NODE_DIRECTORY)
                ? "{DAV:}collection"
                : resourceType;
    },

    /**
     * serialize
     *
     * @param {jsDAV_Handler} handler
     * @param {DOMElement}    recDom
     * @return {void}
     */
    serialize: function(handler, recDom) {
        var recRt = this.resourceType;
        if (!recRt)
            return recDom;
        if (recRt.constructor != Array)
            recRt = [recRt];

        var recResourceType, recPropName, recPrefix;
        var recCnt = 0;
        var recLen = recRt.length;
        for (; recCnt < recLen; ++recCnt) {
            recResourceType = recRt[recCnt];
            if (typeof recResourceType != "string")
                continue;
            if (recPropName = recResourceType.match(/^\{([^\}]*)\}(.*)/)) {
                if (recPrefix = handler.xmlNamespaces[recPropName[1]])
                    recDom += "<" + recPrefix + ":" + recPropName[2] + "/>";
                else
                    recDom += "<custom:" + recPropName[1] + " xmlns:custom=\"" + recPropName[2] + "\"/>";
            }
        }
        return recDom;
    },

    /**
     * Returns the value in clark-notation
     *
     * For example '{DAV:}collection'
     *
     * @return {string}
     */
    getValue: function() {
        return this.resourceType;
    }
});
