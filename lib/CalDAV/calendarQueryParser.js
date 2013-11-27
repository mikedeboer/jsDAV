/*
 * @package jsDAV
 * @subpackage CalDAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Oleg Elifantiev <oleg@elifantiev.ru>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

"use strict";

var Base = require('./../shared/base');
var Util = require("./../shared/util");
var Exc = require("./../shared/exceptions");
var Xml = require("./../shared/xml");
var xpath = require('xpath');
var XPathResult = xpath.XPathResult;
var jsVObject_DateTimeParser = require('./../VObject/dateTimeParser');

function xSelect(expr, doc, single) {

    var nodesWithXMLNS = xpath.select("//@*[starts-with(name(), 'xmlns:')]", doc);
    var revmap = {};

    for(var i = 0, l = nodesWithXMLNS.length; i < l; i++) {
        var node = nodesWithXMLNS[i];

        revmap[node.nodeName.substr(6)] = node.nodeValue;
    }

    var expression = xpath.createExpression(expr, {

        lookupNamespaceURI: function(short) {
            if(short in revmap) {
                console.log('lookupNamespaceURI(' + short + ')->' + revmap[short]);
                return revmap[short];
            }
            for(var fullNs in Xml.xmlNamespaces) {
                if(Xml.xmlNamespaces.hasOwnProperty(fullNs)) {
                    if(Xml.xmlNamespaces[fullNs] == short) {
                        revmap[short] = fullNs;
                        console.log('lookupNamespaceURI(' + short + ')->' + fullNs);
                        return fullNs;
                    }
                }
            }
            console.log('lookupNamespaceURI(' + short + ')->null');
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
        if (single) {
            result = result[0];
        }
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
        //this.xpath.registerNameSpace('cal',Plugin::NS_CALDAV);
        //this.xpath.registerNameSpace('dav','urn:DAV');
    },

    _parseExpand: function (parentNode) {

        var start, end;

        start = parentNode.getAttribute('start');
        if(!start) {
            throw Exc.BadRequest('The "start" attribute is required for the CALDAV:expand element');
        }
        start = parseVObjectDate(start);

        end = parentNode.getAttribute('end');
        if(!end) {
            throw Exc.BadRequest('The "end" attribute is required for the CALDAV:expand element');
        }

        end = parseVObjectDate(end);

        if (end <= start) {
            throw Exc.BadRequest('The end-date must be larger than the start-date in the expand element.');
        }

        return {
            'start': start,
            'end': end
        };
        
    },
    parse: function() {
        var expand,
            filter,
            compFilters;

        filter = xSelect('/cal:calendar-query/cal:filter', this.dom);
        if (filter.length !== 1) {
            throw Exc.BadRequest('Only one filter element is allowed');
        }

        compFilters = this._parseCompFilters(filter[0]);
        if (compFilters.length !==1) {
            throw Exc.BadRequest('There must be exactly 1 top-level comp-filter.');
        }

        this.filters = compFilters[0];
        this.requestedProperties = Object.keys(Xml.parseProperties(this.dom.firstChild));

        expand = xSelect('/cal:calendar-query/dav:prop/cal:calendar-data/cal:expand', this.dom);
        if (expand.length > 0) {
            this.expand = this._parseExpand(expand[0]);
        }

        console.log('CalendarQueryParser::parse', this.filters, this.requestedProperties);
    },

    _parseParamFilters: function (parentNode) {
        var paramFilterNodes,
            paramFilterNode,
            paramFilter,
            result = [];

        paramFilterNodes = xSelect('cal:param-filter', parentNode);

        for(var i= 0, l = paramFilterNodes.length; i < l; i++) {

            paramFilterNode = paramFilterNodes[i];
            paramFilter = {};
            paramFilter['name'] = paramFilterNode.getAttribute('name');
            paramFilter['is-not-defined'] = xSelect('cal:is-not-defined', paramFilterNode).length > 0;
            paramFilter['text-match'] = this._parseTextMatch(paramFilterNode);

            result.push(paramFilter);

        }

        return result;
    },

    _parseTextMatch: function (parentNode) {
        var textMatchNodes,
            textMatchNode,
            negateCondition,
            collation;

        textMatchNodes = this.xpath.query('cal:text-match', parentNode);

        if (textMatchNodes.length === 0) {
            return null;
        }

        textMatchNode = textMatchNodes[0];
        negateCondition = textMatchNode.getAttribute('negate-condition');
        negateCondition = negateCondition === 'yes';
        collation = textMatchNode.getAttribute('collation');
        if (!collation) {
            collation = 'i;ascii-casemap';
        }

        return {
            'negate-condition': negateCondition,
            'collation': collation,
            'value': textMatchNode.nodeValue
        };
    },

    _parsePropFilters: function (parentNode) {
        var propFilterNodes,
            propFilterNode,
            propFilter,
            result = [];

        propFilterNodes = xSelect('cal:prop-filter', parentNode);

        for (var i= 0, l = propFilterNodes.length; i < l; i++) {

            propFilterNode = propFilterNodes[i];
            propFilter = {};
            propFilter['name'] = propFilterNode.getAttribute('name');
            propFilter['is-not-defined'] = xSelect('cal:is-not-defined', propFilterNode).length > 0;
            propFilter['param-filters'] = this._parseParamFilters(propFilterNode);
            propFilter['text-match'] = this._parseTextMatch(propFilterNode);
            propFilter['time-range'] = this._parseTimeRange(propFilterNode);

            result.push(propFilter);

        }

        return result;

    },

    _parseTimeRange: function (parentNode) {

        var timeRangeNodes,
            timeRangeNode,
            start, end;

        timeRangeNodes = xSelect('cal:time-range', parentNode);

        if (timeRangeNodes.length === 0) {
            return null;
        }

        timeRangeNode = timeRangeNodes[0];

        if (start = timeRangeNode.getAttribute('start')) {
            start = jsVObject_DateTimeParser.parseDateTime(start);
        } else {
            start = null;
        }
        if (end = timeRangeNode.getAttribute('end')) {
            end = jsVObject_DateTimeParser.parseDateTime(end);
        } else {
            end = null;
        }

        if (start && end && end <= start) {
            throw Exc.BadRequest('The end-date must be larger than the start-date in the time-range filter');
        }

        return {
            'start': start,
            'end': end
        };
    },

    _parseCompFilters: function(parentNode) {
        var result = [],
            eventTypes = { 'VEVENT': 1, 'VTODO': 1, 'VJOURNAL': 1, 'VFREEBUSY': 1, 'VALARM': 1},
            compFilterNodes,
            compFilterNode,
            compFilter;

        compFilterNodes = xSelect('cal:comp-filter', parentNode);

        for(var i= 0, l = compFilterNodes.length; i < l; i++) {

            compFilterNode = compFilterNodes[i];

            compFilter = {};
            compFilter['mame'] = compFilterNode.getAttribute('name');
            compFilter['is-not-defined'] = xSelect('cal:is-not-defined', compFilterNode).length > 0;
            compFilter['comp-filters'] = this._parseCompFilters(compFilterNode);
            compFilter['prop-filters'] = this._parsePropFilters(compFilterNode);
            compFilter['time-range'] = this._parseTimeRange(compFilterNode);

            if (compFilter['time-range'] && !(compFilter['name'] in eventTypes)) {
                throw Exc.BadRequest('The time-range filter is not defined for the ' + compFilter['name'] + ' component');
            }

            result.push(compFilter);

        }

        return result;
    }

});