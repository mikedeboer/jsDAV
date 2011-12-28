/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV          = require("./../../jsdav");
var jsDAV_Property = require("./../property").jsDAV_Property;

function jsDAV_Property_ResourceType(resourceType) {
    // HACK: This breaks a cyclic require() problem...
    var jsDAV_Handler  = require("./../handler");

    this.resourceType = [];
    if (resourceType === jsDAV_Handler.NODE_DIRECTORY)
        this.add("{DAV:}collection");

    else if(resourceType !== undefined)
        this.add(resourceType);
}

exports.jsDAV_Property_ResourceType = jsDAV_Property_ResourceType;

(function() {
    this.REGBASE = this.REGBASE | jsDAV.__PROP_RESOURCETYPE__;

    this.add = function(resourceType) {
        if(Array.isArray(resourceType))
            this.resourceType = this.resourceType.concat(resourceType);
        else
            this.resourceType.push(resourceType);
    }

    /**
     * serialize
     *
     * @param {jsDAV_Handler} handler
     * @param {DOMElement}    recDom
     * @return {void}
     */
    this.serialize = function(handler, recDom) {
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
            recDom += handler.generateXmlTag(recResourceType);
        }
        return recDom;
    };

    /**
     * Returns the value in clark-notation
     *
     * For example '{DAV:}collection'
     *
     * @return {string}
     */
    this.getValue = function() {
        return this.resourceType;
    };
}).call(jsDAV_Property_ResourceType.prototype = new jsDAV_Property());
