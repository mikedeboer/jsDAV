/*
 * @package jsDAV
 * @subpackage CalDAV
 * @copyright Copyright(c) 2011 Tri Tech Computers Ltd. <info AT tri-tech DOT com>
 * @author James Emerton <james AT tri-tech DOT com>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var Async = require("asyncjs");
var icalendar = require("icalendar");
var util = require('util');

var Exc = require("./../DAV/exceptions");
var Util = require("./../DAV/util");

var jsDAV = require("./../jsdav");
var jsDAV_ServerPlugin = require("./../DAV/plugin").jsDAV_ServerPlugin;

var jsDAV_Property_Href = require("./../DAV/property/href").jsDAV_Property_Href;
var jsDAV_Property_HrefList = require("./../DAV/property/hreflist").jsDAV_Property_HrefList;
var jsDAV_CalDAV_CalendarQueryParser = require('./calendarQueryParser.js').jsDAV_CalDAV_CalendarQueryParser;
var jsDAV_CalDAV_CalendarQueryValidator = require('./calendarQueryValidator.js').jsDAV_CalDAV_CalendarQueryValidator;


var NS_CALDAV = 'urn:ietf:params:xml:ns:caldav';
var NS_CALENDARSERVER = 'http://calendarserver.org/ns/';


function jsDAV_CalDAV_Plugin(handler) {
    this.handler = handler;

    this.handler.addEventListener("unknownMethod", this.unknownMethod.bind(this));
    this.handler.addEventListener("report", this.report.bind(this));
    this.handler.addEventListener("beforeGetProperties", this.beforeGetProperties.bind(this));

    this.handler.resourceTypeMapping[jsDAV.__ICALENDAR__] = '{urn:ietf:params:xml:ns:caldav}calendar';

    this.handler.xmlNamespaces[NS_CALDAV] = 'cal';
    this.handler.xmlNamespaces[NS_CALENDARSERVER] = 'cs';

    this.handler.protectedProperties = this.handler.protectedProperties.concat([
        '{'+NS_CALDAV+'}supported-calendar-component-set',
        '{'+NS_CALDAV+'}supported-calendar-data',
        '{'+NS_CALDAV+'}max-resource-size',
        '{'+NS_CALDAV+'}min-date-time',
        '{'+NS_CALDAV+'}max-date-time',
        '{'+NS_CALDAV+'}max-instances',
        '{'+NS_CALDAV+'}max-attendees-per-instance',
        '{'+NS_CALDAV+'}calendar-home-set',
        '{'+NS_CALDAV+'}supported-collation-set',
        '{'+NS_CALDAV+'}calendar-data',

        // scheduling extension
        '{'+NS_CALDAV+'}calendar-user-address-set',

        // CalendarServer extensions
        '{'+NS_CALENDARSERVER+'}getctag',
        '{'+NS_CALENDARSERVER+'}calendar-proxy-read-for',
        '{'+NS_CALENDARSERVER+'}calendar-proxy-write-for'
    ]);
}

(function() {

    /**
     * This is the official CalDAV namespace
     */
    jsDAV_CalDAV_Plugin.NS_CALDAV = NS_CALDAV;
    
    /**
     * This is the namespace for the proprietary calendarserver extensions
     */
    jsDAV_CalDAV_Plugin.NS_CALENDARSERVER = NS_CALENDARSERVER;

    /**
     * The following constants are used to differentiate
     * the various filters for the calendar-query report
     */
    this.FILTER_COMPFILTER   = 1;
    this.FILTER_TIMERANGE    = 3;
    this.FILTER_PROPFILTER   = 4;
    this.FILTER_PARAMFILTER  = 5;
    this.FILTER_TEXTMATCH    = 6;

    /**
     * The hardcoded root for calendar objects. It is unfortunate
     * that we're stuck with it, but it will have to do for now
     */
    jsDAV_CalDAV_Plugin.CALENDAR_ROOT = 'calendars';

    /**
     * Returns a list of features for the DAV: HTTP header. 
     * 
     * @return array 
     */
    this.getFeatures = function() {
        return ['calendar-access', 'calendar-proxy'];

    }

    /**
     * Returns a plugin name.
     * 
     * Using this name other plugins will be able to access other plugins
     * using Sabre_DAV_Server::getPlugin 
     * 
     * @return string 
     */
    this.getPluginName = function() {
        return 'caldav';

    }


    /**
     * Returns a list of reports this plugin supports.
     *
     * This will be used in the {DAV:}supported-report-set property.
     * Note that you still need to subscribe to the 'report' event to actually
     * implement them
     *
     * @param string $uri
     * @return array
     */
    this.getSupportedReportSet = function(uri, callback) {
        this.handler.getNodeForPath(uri, function(err, node) {
            if(err) return callback(err);

            var reports = [];

            if(node.hasFeature(jsDAV.__ICALENDAROBJECT__)) {
                reports.push('{'+jsDAV_CalDAV_Plugin.NS_CALDAV+'}calendar-multiget');
                reports.push('{'+jsDAV_CalDAV_Plugin.NS_CALDAV+'}calendar-query');
            }
            if(node.hasFeature(jsDAV.__ICALENDAR__)) {
//                reports.push('{'+jsDAV_CalDAV_Plugin.NS_CALDAV+'}free-busy-query');
            }
    
            callback(null, reports);
        });
    }

    
    /**
     * This function handles support for the MKCALENDAR method
     * 
     * @param string $method 
     * @return bool 
     */
    this.unknownMethod = function(e, method) {
        if(method == 'MKCALENDAR')
            this.httpMkcalendar(e);
        else
            e.next();
    }

    /**
     * This functions handles REPORT requests specific to CalDAV
     *
     * @param string $reportName
     * @param DOMNode $dom
     * @return bool
     */
    this.report = function(e, reportName, dom) {
        switch(reportName) {
            case '{'+jsDAV_CalDAV_Plugin.NS_CALDAV+'}calendar-multiget' :
                return this.calendarMultiGetReport(e, dom);
                break;
            case '{'+jsDAV_CalDAV_Plugin.NS_CALDAV+'}calendar-query' :
                return this.calendarQueryReport(e, dom);
                break;
//            case '{'+jsDAV_CalDAV_Plugin.NS_CALDAV+'}free-busy-query' :
//                this.freeBusyQueryReport(e, dom);
//                break;
        }

        e.next();
    }
    
    /**
     * This function handles the MKCALENDAR HTTP method, which creates
     * a new calendar.
     * 
     * @param string $uri
     * @return void 
     */
    this.httpMkcalendar = function(e) {
        // I put this here for completeness sake, but supporting MKCALENDAR
        // is impossible without making changes to http_parser and Node.js itself
        e.next(new Exc.jsDAV_Exception_Forbidden("MKCALENDAR is not supported"));
    }

    /**
     * beforeGetProperties
     *
     * This method handler is invoked before any after properties for a
     * resource are fetched. This allows us to add in any CalDAV specific 
     * properties. 
     * 
     * @param string $path
     * @param Sabre_DAV_INode $node
     * @param array $requestedProperties
     * @param array $returnedProperties
     * @return void
     */
    this.beforeGetProperties = function(e, path, node, propertyNames, newProperties) {
        var self = this;

        // Cache values...
        var readlist = undefined;
        var writelist = undefined;

        Async.list(propertyNames)
            .each(function(prop, cbnextprop) {
                if(node.hasFeature(jsDAV.__IPRINCIPAL__)) {
                    switch(prop) {
                        case "{"+jsDAV_CalDAV_Plugin.NS_CALDAV+"}calendar-home-set":
                            var principalId = node.getName();
                            var calendarHomePath = jsDAV_CalDAV_Plugin.CALENDAR_ROOT+"/"+principalId+"/";
                            newProperties["200"][prop] = new jsDAV_Property_Href(calendarHomePath);
                            return cbnextprop();

                        case "{"+jsDAV_CalDAV_Plugin.NS_CALDAV+"}calendar-user-address-set":
                            var addresses = node.getAlternateUriSet();
                            addresses.push(self.handler.server.getBaseUri()+node.getPrincipalUrl());
                            newProperties["200"][prop] = new jsDAV_Property_HrefList(addresses, false);
                            return cbnextprop();

                        case "{"+jsDAV_CalDAV_Plugin.NS_CALENDARSERVER+"}calendar-proxy-read-for":
                        case "{"+jsDAV_CalDAV_Plugin.NS_CALENDARSERVER+"}calendar-proxy-write-for":
                            var set_proxy_for = (function(err) {
                                if(err) return cbnextprop(err);

                                if(prop === "{"+jsDAV_CalDAV_Plugin.NS_CALENDARSERVER+"}calendar-proxy-read-for")
                                    newProperties["200"][prop] = new jsDAV_Property_HrefList(readlist);
                                else
                                    newProperties["200"][prop] = new jsDAV_Property_HrefList(writelist);
                                cbnextprop();
                            });

                            if(readlist !== undefined && writelist !== undefined) {
                                set_proxy_for(null);
                            }
                            else {
                                node.getGroupMembership(function(err, members) {
                                    if(err) return cbnextprop(err);
                                    readlist = [];
                                    writelist = [];

                                    Async.list(members)
                                        .each(function(group, cbnextgroup) {
                                            this.handler.getNodeForPath(group, function(err, groupNode) {
                                                // If the node is either ap proxy-read or proxy-write
                                                // group, we grab the parent principal and add it to the
                                                // list.
                                                if (groupNode instanceof jsDAV_CalDAV_Principal_ProxyRead)
                                                    readlist = readlist.concat(Util.splitPath(group));

                                                if (groupNode instanceof jsDAV_CalDAV_Principal_ProxyWrite)
                                                    writelist = readlist.concat(Util.splitPath(group));
                                            });
                                        })
                                        .end(set_proxy_for);
                                });
                            }
                        return;
                    }
                }


                if (node.hasFeature(jsDAV.__ICALENDAROBJECT__) &&
                        prop === '{'+jsDAV_CalDAV_Plugin.NS_CALDAV+'}calendar-data') {
                    // The calendar-data property is not supposed to be a 'real'
                    // property, but in large chunks of the spec it does act as such.
                    // Therefore we simply expose it as a property.
                    node.get(function(err, data) {
                        if(err) return cbnextprop(err);
                        newProperties["200"][prop] = data.toString('utf8').replace("\r", "");
                        cbnextprop();
                    });
                    return;
                }
                
                cbnextprop();
            })
            .end(e.next.bind(e));
    }


    /**
     * This function handles the calendar-multiget REPORT.
     *
     * This report is used by the client to fetch the content of a series
     * of urls. Effectively avoiding a lot of redundant requests.
     *
     * @param DOMNode $dom
     * @return void
     */
    this.calendarMultiGetReport = function(e, dom) {
        var self = this;
        var properties = Object.keys(Util.parseProperties(dom));

        var expand = dom.get('/c:calendar-multiget/d:prop/c:calendar-data/c:expand', {
            'd': 'DAV:', 'c': jsDAV_CalDAV_Plugin.NS_CALDAV });

        if(expand) {
            throw new Error("expand property is not implemented");
            var start = expand.attr('start').value();
            var end = expand.attr('end').value();
            if(!start || !end) {
                e.next(new Exc.jsDAV_Exception_BadRequest(
                    'The "start" and "end" attributes are required for the CALDAV:expand element'));
            } 
            // TODO: Parse dates
            //start = Sabre_VObject_DateTimeParser::parseDateTime($start);
            //end = Sabre_VObject_DateTimeParser::parseDateTime($end);
            
            if (end <= start) {
                e.next(new Exc.jsDAV_Exception_BadRequest(
                    'The end-date must be larger than the start-date in the expand element.'));
            }

            expand = true; 
        }
        else {
            expand = false;
        }

        var propertyList = {};
        Async.list(dom.find('xmlns:href', 'DAV:'))
            .each(function(elem, cbnexthref) {
                var uri = self.handler.calculateUri(elem.text());
                self.handler.getPropertiesForPath(uri, properties, 0, function(err, objprops) {
                    if(err) return cbnexthref(err);

                    if(expand && objprops["200"]["{"+jsDAV_CalDAV_Plugin.NS_CALDAV+"}calendar-data"]) {
                        throw new Error("expand property is not implemented");
                        //$vObject = Sabre_VObject_Reader::read($objProps[200]['{' . self::NS_CALDAV . '}calendar-data']);
                        //$vObject->expand($start, $end);
                        //$objProps[200]['{' . self::NS_CALDAV . '}calendar-data'] = $vObject->serialize();
                    }
                    
                    propertyList[uri] = objprops[uri];
                    cbnexthref();
                });

            })
            .end(function(err) {
                if(err) return e.next(err);

                self.handler.sendResponse(207, self.handler.generateMultiStatus(propertyList));
                e.stop();
            });
    }


    /**
     * This function handles the calendar-query REPORT
     *
     * This report is used by clients to request calendar objects based on
     * complex conditions.
     *
     * @param DOMNode $dom
     * @return void
     */
    this.calendarQueryReport = function(e, dom) {
        var self = this;
        var parser = new jsDAV_CalDAV_CalendarQueryParser(dom);

        var requestedCalendarData = true;
        var requestedProperties = parser.requestedProperties;

        if(requestedProperties.indexOf('{'+NS_CALDAV+'}calendar-data') == -1) {
            // We always retrieve calendar-data, as we need it for filtering.
            requestedProperties.push('{'+NS_CALDAV+'}calendar-data');

            // If calendar-data wasn't explicitly requested, we need to remove
            // it after processing.
            requestedCalendarData = false;
        }

        // These are the list of nodes that potentially match the requirement
        self.handler.getPropertiesForPath(self.handler.getRequestUri(), requestedProperties,
            self.handler.getHTTPDepth(1), function(err, candidateNodes) {
                if(err) return e.next(err);

                var verifiedNodes = [];
                var validator = new jsDAV_CalDAV_CalendarQueryValidator();

                for(var path in candidateNodes) {
                    var node = candidateNodes[path];

                    // If the node didn't have a calendar-data property, it must not be a calendar object
                    if (!node["200"]['{'+NS_CALDAV+'}calendar-data'])
                        continue;

                    var vObject = icalendar.iCalendar.parse(node['200']['{'+NS_CALDAV+'}calendar-data']);

                    if (validator.validate(vObject, parser.filters)) {
                        if (!requestedCalendarData)
                            delete node['200']['{'+NS_CALDAV+'}calendar-data'];

                        if (parser.expand) {
                            return e.next(new Exc.jsDAV_Exception_NotImplemented(
                                    "calendar-query expand is not implemented!"));
//                            vObject.expand(parser.expand['start'], parser.expand['end']);
//                            node['200']['{'+NS_CALDAV+'}calendar-data'] = vObject.toString();
                        } 

                        verifiedNodes.push(node);
                    }
                }

                self.handler.sendResponse(207, self.handler.generateMultiStatus(verifiedNodes));
                e.stop();
        });
    }
    
}).call(jsDAV_CalDAV_Plugin.prototype = new jsDAV_ServerPlugin());

module.exports = jsDAV_CalDAV_Plugin;
