/**
 * Parses the calendar-query report request body.
 *
 * Whoever designed this format, and the CalDAV equivalent even more so,
 * has no feel for design.
 *
 * @package jsDAV
 * @subpackage CalDAV
 * @copyright Copyright(c) 2011 Tri Tech Computers Ltd. <info AT tri-tech DOT com>
 * @copyright Copyright (C) 2007-2011 Rooftop Solutions. All rights reserved.
 * @author Evert Pot (http://www.rooftopsolutions.nl/)
 * @author James Emerton <james AT tri-tech DOT com>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var icalendar = require('icalendar');


var Exc = require("./../DAV/exceptions");
var Util = require('./../DAV/util');

var jsDAV_CalDAV_Plugin = require('./plugin');



var XPATH_NS = {
    'cal': 'urn:ietf:params:xml:ns:caldav',
    'dav': 'DAV:'
};


function attr(node, name) {
    var attr = node.attr(name);
    return attr ? attr.value() : null;
}


function jsDAV_CalDAV_CalendarQueryParser(dom) {
    this.dom = dom;
    this.parse();
}

(function() {
    /**
     * Parses the request.
     *
     * @return void
     */
    this.parse = function() {
        var filterNode = null;

        var filter = this.dom.find('//cal:calendar-query/cal:filter', XPATH_NS);

        if (filter.length !== 1)
            throw new Exc.jsDAV_Exception_BadRequest('Only one filter element is allowed');

        var compFilters = this.parseCompFilters(filter[0]);
        if (compFilters.length !== 1)
            throw new Exc.jsDAV_Exception_BadRequest('There must be exactly 1 top-level comp-filter.');

        this.filters = compFilters[0];
        this.requestedProperties = Object.keys(Util.parseProperties(this.dom));

        var expand = this.dom.get('/cal:calendar-query/dav:prop/cal:calendar-data/cal:expand', XPATH_NS);
        if (expand)
            this.expand = this.parseExpand(expand);
    }

    /**
     * Parses all the 'comp-filter' elements from a node
     *
     * @param DOMElement $parentNode
     * @return array
     */
    this.parseCompFilters = function(parentNode) {
        var compFilterNodes = parentNode.find('cal:comp-filter', XPATH_NS);
        var result = [];

        for(var ii=0; ii < compFilterNodes.length; ii++) {
            var compFilterNode = compFilterNodes[ii];

            var compFilter = {};
            compFilter['name'] = attr(compFilterNode, 'name');
            compFilter['is-not-defined'] = compFilterNode.find('cal:is-not-defined', XPATH_NS).length > 0;
            compFilter['comp-filters'] = this.parseCompFilters(compFilterNode);
            compFilter['prop-filters'] = this.parsePropFilters(compFilterNode);
            compFilter['time-range'] = this.parseTimeRange(compFilterNode);

            if (compFilter['time-range'] && ['VEVENT','VTODO','VJOURNAL','VFREEBUSY'].indexOf(compFilter['name']) == -1)
                throw new Exc.jsDAV_Exception_BadRequest('The time-range filter is not defined for the '+compFilter['name']+' component');

            result.push(compFilter);
        }

        return result;
    }

    /**
     * Parses all the prop-filter elements from a node
     *
     * @param DOMElement $parentNode
     * @return array
     */
    this.parsePropFilters = function(parentNode) {
        var propFilterNodes = parentNode.find('cal:prop-filter', XPATH_NS);
        var result = [];

        for (var ii=0; ii < propFilterNodes.length; ii++) {
            var propFilterNode = propFilterNodes[ii];

            result.push({
                'name': attr(propFilterNode, 'name'),
                'is-not-defined': propFilterNode.find('cal:is-not-defined', XPATH_NS).length > 0,
                'param-filters': this.parseParamFilters(propFilterNode),
                'text-match': this.parseTextMatch(propFilterNode),
                'time-range': this.parseTimeRange(propFilterNode)
            });
        }

        return result;
    }

    /**
     * Parses the param-filter element
     *
     * @param DOMElement $parentNode
     * @return array
     */
    this.parseParamFilters = function(parentNode) {
        var paramFilterNodes = parentNode.find('cal:param-filter', XPATH_NS);
        var result = [];

        for(var ii=0; ii<paramFilterNodes.length; ii++) {
            var paramFilterNode = paramFilterNodes[ii];

            result.push({
                'name': attr(paramFilterNode, 'name'),
                'is-not-defined': paramFilterNode.find('cal:is-not-defined', XPATH_NS).length > 0,
                'text-match': this.parseTextMatch(paramFilterNode)
            });
        }

        return result;

    }

    /**
     * Parses the text-match element
     *
     * @param DOMElement $parentNode
     * @return array|null
     */
    this.parseTextMatch = function(parentNode) {
        var textMatchNode = parentNode.get('cal:text-match', XPATH_NS);

        if (!textMatchNode)
            return null;

        return {
            'negate-condition': attr(textMatchNode, 'negate-condition') === 'yes',
            'collation': attr(textMatchNode, 'collation') || 'i;ascii-casemap',
            'value': textMatchNode.text()
        };
    }

    /**
     * Parses the time-range element
     *
     * @param DOMElement $parentNode
     * @return array|null
     */
    this.parseTimeRange = function(parentNode) {
        var timeRangeNode = parentNode.get('cal:time-range', XPATH_NS);
        if(!timeRangeNode)
            return null;

        var start = attr(timeRangeNode, 'start');
        var end = attr(timeRangeNode, 'end');

        if (start)
            start = icalendar.parse_value('DATE-TIME', start);

        if (end)
            end = icalendar.parse_value('DATE-TIME', end);

        if (start && end && end <= start)
            throw new Exc.jsDAV_Exception_BadRequest('The end-date must be larger than the start-date in the time-range filter');

        return {
            'start': start,
            'end': end
        };
    }

    /**
     * Parses the CALDAV:expand element
     * 
     * @param DOMElement $parentNode 
     * @return void
     */
    this.parseExpand = function(parentNode) {
        var start = attr(parentNode, 'start');
        if(!start)
            throw new Exc.jsDAV_Exception_BadRequest('The "start" attribute is required for the CALDAV:expand element');

        start = icalendar.parse_value('DATE-TIME', start);

        var end = attr(parentNode, 'end');
        if(!end)
            throw new Exc.jsDAV_Exception_BadRequest('The "end" attribute is required for the CALDAV:expand element');
        end = icalendar.parse_value('DATE-TIME', end);
        
        if (end <= start)
            throw new Exc.jsDAV_Exception_BadRequest('The end-date must be larger than the start-date in the expand element.');

        return {
            'start': start,
            'end': end
        };
    }
}).call(jsDAV_CalDAV_CalendarQueryParser.prototype);

exports.jsDAV_CalDAV_CalendarQueryParser = jsDAV_CalDAV_CalendarQueryParser;

