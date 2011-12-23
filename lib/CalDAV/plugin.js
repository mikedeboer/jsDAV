/*
 * @package jsDAV
 * @subpackage CalDAV
 * @copyright Copyright(c) 2011 Tri Tech Computers Ltd. <info AT tri-tech DOT com>
 * @author James Emerton <james AT tri-tech DOT com>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var Async = require("./../../support/async.js");
var Exc = require("./../DAV/exceptions");

var jsDAV = require("./../jsdav");
var jsDAV_ServerPlugin = require("./../DAV/plugin").jsDAV_ServerPlugin;

var jsDAV_Property_Href = require("./../DAV/property/href").jsDAV_Property_Href;
var jsDAV_Property_HrefList = require("./../DAV/property/hreflist").jsDAV_Property_HrefList;


function jsDAV_CalDAV_Plugin(handler) {
    this.handler = handler;

    this.handler.addEventListener("unknownMethod", this.unknownMethod.bind(this));
    this.handler.addEventListener("beforeGetProperties", this.beforeGetProperties.bind(this));
}

(function() {

    /**
     * This is the official CalDAV namespace
     */
    jsDAV_CalDAV_Plugin.NS_CALDAV = 'urn:ietf:params:xml:ns:caldav';
    
    /**
     * This is the namespace for the proprietary calendarserver extensions
     */
    jsDAV_CalDAV_Plugin.NS_CALENDARSERVER = 'http://calendarserver.org/ns/';

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
                    }
                }


                if (node.hasFeature(jsDAV.__ICALENDAROBJECT__) &&
                        prop === '{'+jsDAV_CalDAV_Plugin.NS_CALDAV+'}calendar-data') {
                    // The calendar-data property is not supposed to be a 'real'
                    // property, but in large chunks of the spec it does act as such.
                    // Therefore we simply expose it as a property.
                    node.get(function(err, data) {
                        if(err) return cbnextprop(err);
                        returnedProperties["200"][prop] = data.toString('utf8').replace("\r", "");
                        cbnextprop();
                    });
                    return;
                }
                
                cbnextprop();
            })
            .end(e.next.bind(e));
    }

}).call(jsDAV_CalDAV_Plugin.prototype = new jsDAV_ServerPlugin());

module.exports = jsDAV_CalDAV_Plugin;
