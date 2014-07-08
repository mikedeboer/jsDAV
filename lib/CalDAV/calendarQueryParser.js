/*
 * @package jsDAV
 * @subpackage CalDAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Oleg Elifantiev <oleg@elifantiev.ru>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

"use strict";

var Base = require("./../shared/base");
var Util = require("./../shared/util");
var Exc = require("./../shared/exceptions");
var Xml = require("./../shared/xml");
var xpath = require("xpath");
var XPathResult = xpath.XPathResult;
var jsVObject_DateTimeParser = require("./../VObject/dateTimeParser");

function xSelect(expr, doc, single) {
    var nodesWithXMLNS = xpath.select("//@*[starts-with(name(), 'xmlns:')]", doc);
    var revmap = {};

    for (var node, i = 0, l = nodesWithXMLNS.length; i < l; i++) {
        node = nodesWithXMLNS[i];
        revmap[node.nodeName.substr(6)] = node.nodeValue;
    }

    // FIXME THIS IS UGLY!
    var expression = xpath.createExpression(expr, {
        lookupNamespaceURI: function(short) {
            if (short in revmap)
                return revmap[short];

            for (var fullNs in Xml.xmlNamespaces) {
                if (Xml.xmlNamespaces.hasOwnProperty(fullNs)) {
                    if (Xml.xmlNamespaces[fullNs] == short) {
                        revmap[short] = fullNs;
                        return fullNs;
                    }
                }
            }
            return null;
        }
    });

    var type = XPathResult.ANY_TYPE;

    var result = expression.evaluate(doc, type, null);
    if (result.resultType == XPathResult.STRING_TYPE) {
        result = result.stringValue;
    }
    else if (result.resultType == XPathResult.NUMBER_TYPE) {
        result = result.numberValue;
    }
    else if (result.resultType == XPathResult.BOOLEAN_TYPE) {
        result = result.booleanValue;
    }
    else {
        result = result.nodes;
        if (single)
            result = result[0];
    }

    return result;
}

var jsCalDAV_CalendarQueryParser = module.exports = Base.extend({
    dom: null,
    filters: null,
    requestedProperties: null,
    expand: null,

    initialize: function(dom) {
        this.dom = dom;
        //this.xpath = new \DOMXPath($dom);
        //this.xpath.registerNameSpace("cal",Plugin::NS_CALDAV);
        //this.xpath.registerNameSpace("dav","urn:DAV");
    },

    _parseExpand: function (parentNode) {
        var start = parentNode.getAttribute("start");
        if (!start)
            throw Exc.BadRequest("The 'start' attribute is required for the CALDAV:expand element");

        start = jsVObject_DateTimeParser.parseDateTime(start);

        var end = parentNode.getAttribute("end");
        if (!end)
            throw Exc.BadRequest("The 'end' attribute is required for the CALDAV:expand element");

        end = jsVObject_DateTimeParser.parseDateTime(end);

        if (end <= start)
            throw Exc.BadRequest("The end-date must be larger than the start-date in the expand element.");

        return {
            "start": start,
            "end": end
        };
        
    },

    parse: function() {
        var filter = xSelect("/cal:calendar-query/cal:filter", this.dom);
        if (filter.length !== 1)
            throw Exc.BadRequest("Only one filter element is allowed");

        var compFilters = this._parseCompFilters(filter[0]);
        if (compFilters.length !==1)
            throw Exc.BadRequest("There must be exactly 1 top-level comp-filter.");

        this.filters = compFilters[0];
        this.requestedProperties = Object.keys(Xml.parseProperties(this.dom));

        var expand = xSelect("/cal:calendar-query/dav:prop/cal:calendar-data/cal:expand", this.dom);
        if (expand.length > 0)
            this.expand = this._parseExpand(expand[0]);
    },

    _parseParamFilters: function (parentNode) {
        var paramFilterNodes = xSelect("cal:param-filter", parentNode);

        var paramFilterNode;
        var result = [];
        for (var i = 0, l = paramFilterNodes.length; i < l; i++) {
            paramFilterNode = paramFilterNodes[i];
            result.push({
                "name": paramFilterNode.getAttribute("name"),
                "is-not-defined": xSelect("cal:is-not-defined", paramFilterNode).length > 0,
                "text-match": this._parseTextMatch(paramFilterNode)
            });
        }

        return result;
    },

    _parseTextMatch: function (parentNode) {
        var textMatchNodes = xSelect("cal:text-match", parentNode);

        if (textMatchNodes.length === 0)
            return null;

        var textMatchNode = textMatchNodes[0];
        var negateCondition = textMatchNode.getAttribute("negate-condition");
        negateCondition = negateCondition == "yes";
        var collation = textMatchNode.getAttribute("collation");
        if (!collation)
            collation = "i;ascii-casemap";

        return {
            "negate-condition": negateCondition,
            "collation": collation,
            "value": textMatchNode.textContent
        };
    },

    _parsePropFilters: function (parentNode) {
        var propFilterNodes = xSelect("cal:prop-filter", parentNode);

        var propFilterNode;
        var result = [];
        for (var i = 0, l = propFilterNodes.length; i < l; i++) {
            propFilterNode = propFilterNodes[i];
            result.push({
                name: propFilterNode.getAttribute("name"),
                "is-not-defined": xSelect("cal:is-not-defined", propFilterNode).length > 0,
                "param-filters": this._parseParamFilters(propFilterNode),
                "text-match": this._parseTextMatch(propFilterNode),
                "time-range": this._parseTimeRange(propFilterNode)
            });
        }

        return result;
    },

    _parseTimeRange: function (parentNode) {
        var timeRangeNodes = xSelect("cal:time-range", parentNode);
        if (!timeRangeNodes.length)
            return null;

        var timeRangeNode = timeRangeNodes[0];

        var start = timeRangeNode.getAttribute("start");
        start = start ? jsVObject_DateTimeParser.parseDateTime(start) : null;

        var end = timeRangeNode.getAttribute("end");
        end = end ? jsVObject_DateTimeParser.parseDateTime(end) : null;

        if (start && end && end <= start)
            throw Exc.BadRequest("The end-date must be larger than the start-date in the time-range filter");

        return {
            "start": start,
            "end": end
        };
    },

    _parseCompFilters: function(parentNode) {
        var result = [];
        var eventTypes = { "VEVENT": 1, "VTODO": 1, "VJOURNAL": 1, "VFREEBUSY": 1, "VALARM": 1};

        var compFilterNodes = xSelect("cal:comp-filter", parentNode);
        var compFilterNode, compFilter;
        for (var i = 0, l = compFilterNodes.length; i < l; i++) {
            compFilterNode = compFilterNodes[i];

            compFilter = {
                name: compFilterNode.getAttribute("name"),
                "is-not-defined": xSelect("cal:is-not-defined", compFilterNode).length > 0,
                "comp-filters": this._parseCompFilters(compFilterNode),
                "prop-filters": this._parsePropFilters(compFilterNode),
                "time-range": this._parseTimeRange(compFilterNode)
            };

            if (compFilter["time-range"] && !(compFilter["name"] in eventTypes)) {
                throw Exc.BadRequest("The time-range filter is not defined for the "
                    + compFilter["name"] + " component");
            }

            result.push(compFilter);
        }

        return result;
    }
});
