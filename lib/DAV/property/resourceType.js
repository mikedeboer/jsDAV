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

var Util = require("./../../shared/util");
var Xml = require("./../../shared/xml");

var jsDAV_Property_ResourceType = module.exports = jsDAV_Property.extend({
    initialize: function(resourceType) {
        if (resourceType === jsDAV_Handler.NODE_FILE)
            this.resourceType = [];
        else if (resourceType === jsDAV_Handler.NODE_DIRECTORY)
            this.resourceType = ["{DAV:}collection"];
        else if (Array.isArray(resourceType))
            this.resourceType = resourceType;
        else
            this.resourceType = [resourceType];
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
        if (!Array.isArray(recRt))
            recRt = [recRt];

        var recResourceType, recPropName, recPrefix;
        var recCnt = 0;
        var recLen = recRt.length;
        for (; recCnt < recLen; ++recCnt) {
            recResourceType = recRt[recCnt];
            if (typeof recResourceType != "string")
                continue;
            if (recPropName = recResourceType.match(/^\{([^\}]*)\}(.*)/)) {
                if (recPrefix = Xml.xmlNamespaces[recPropName[1]])
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
    },
    
    /**
     * Checks if the principal contains a certain value
     *
     * @param {String} type
     * @return bool
     */
    is: function(type) {
        return this.resourceType.indexOf(type) > -1;
    },

    /**
     * Adds a resourcetype value to this property
     *
     * @param {String} type
     * @return void
     */
    add: function(type) {
        this.resourceType.push(type);
        this.resourceType = Util.makeUnique(this.resourceType);
    },

    /**
     * Unserializes a DOM element into a ResourceType property.
     *
     * @param DOMElement dom
     * @return jsDAV_Property_ResourceType
     */
    unserialize: function(dom) {
        var value = [];
        for (var i = 0, l = dom.childNodes.length; i < l; ++i) {
            value.push(Xml.toClarkNotation(dom.childNodes[i]));
        }
        return jsDAV_Property_ResourceType.new(value);
    }
});
