/*
 * @package jsDAV
 * @subpackage DAVACL
 * @copyright Copyright(c) 2011 Tri Tech Computers Ltd. <info AT tri-tech DOT com>
 * @author James Emerton <james AT tri-tech DOT com>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var Async = require("./../../support/async.js");
var Exc = require("./../DAV/exceptions");
var Util = require("./../DAV/util");

var jsDAV = require("./../jsdav");
var jsDAV_ServerPlugin = require("./../DAV/plugin").jsDAV_ServerPlugin;

var jsDAV_Property_HrefList = require("./../DAV/property/hreflist").jsDAV_Property_HrefList;
var jsDAV_Property_Princpal = require("./property/principal").jsDAV_Property_Princpal;


function jsDAV_DAVACL_Plugin(handler) {
    this.handler = handler;

    handler.addEventListener("beforeGetProperties", this.beforeGetProperties.bind(this));
    handler.addEventListener("report", this.report.bind(this));
}

(function() {
    /**
     * List of urls containing principal collections.
     * Modify this if your principals are located elsewhere.
     *
     * @var array
     */
    this.principalCollectionSet = [
        'principals'
    ];
    
    /**
     * This string is prepended to the username of the currently logged in
     * user. This allows the plugin to determine the principal path based on
     * the username.
     *
     * @var string
     */
    this.defaultUsernamePath = 'principals';
    
    /**
     * This list of properties are the properties a client can search on using
     * the {DAV:}principal-property-search report.
     *
     * The keys are the property names, values are descriptions.
     *
     * @var array
     */
    this.principalSearchPropertySet = {
        '{DAV:}displayname': 'Display name',
        '{http://ajax.org/2005/aml}email-address': 'Email address'
    };

    /**
     * Returns a list of features added by this plugin.
     *
     * This list is used in the response of a HTTP OPTIONS request.
     *
     * @return array
     */
    this.getFeatures = function() {
        return ['access-control'];
    }

    /**
     * Returns a list of available methods for a given url
     *
     * @param string $uri
     * @return array
     */
    this.getMethods = function() {
        // Currently disabled because NodeJS is unable to handle the ACL method
        //return ['ACL'];
        return [];
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
        return 'acl';
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
    this.getSupportedReportSet = function(uri) {
        return [
            '{DAV:}principal-search-property-set',
        ];
    }
    
    /**
     * Returns the standard users' principal.
     *
     * This is one authorative principal url for the current user.
     * This method will return null if the user wasn't logged in.
     *
     * @return string|null
     */
    this.getCurrentUserPrincipal = function() {
        var authPlugin = this.handler.plugins['auth'];
        if(authPlugin === undefined) return null;

        var user = authPlugin.getCurrentUser();
        return (user ? this.defaultUsernamePath+'/'+user : null);
    }
    
    this.beforeGetProperties = function(e, path, node, propertyNames, newProperties) {
        var self = this;
        Async.list(propertyNames)
            .each(function(prop, cbnextprop) {
                switch(prop) {
                    case "{DAV:}current-user-principal":
                        var user = self.getCurrentUserPrincipal();
                        if(user) {
                            newProperties["200"][prop] = new jsDAV_Property_Princpal(
                                jsDAV_Property_Princpal.HREF, user);
                        }
                        else {
                            newProperties["200"][prop] = new jsDAV_Property_Princpal(
                                jsDAV_Property_Princpal.UNAUTHENTICATED);
                        }
                        return cbnextprop();

                    case "{DAV:}principal-collection-set":
                        var principal_urls = [];
                        for(var i=0; i<self.principalCollectionSet.length; ++i)
                            principal_urls.push(self.principalCollectionSet[i]+"/");
                        newProperties["200"][prop] = new jsDAV_Property_HrefList(principal_urls);
                        return cbnextprop();
                }

                if(node.hasFeature(jsDAV.__IPRINCIPAL__)) {
                    switch(prop) {
                        case "{DAV:}displayname":
                            newProperties["200"][prop] = node.getDisplayName();
                            return cbnextprop();
                    }
                }

                cbnextprop();
            })
            .end(e.next.bind(e));
    }

    /**
     * This method handels HTTP REPORT requests
     *
     * @param string $reportName
     * @param DOMNode $dom
     * @return bool
     */
    this.report = function(e, reportName, dom) {
        switch(reportName) {
            case '{DAV:}principal-search-property-set':
                this.principalSearchPropertySetReport(e, dom);
                break;
        }
    }

    /**
     * principalSearchPropertySetReport
     *
     * This method responsible for handing the
     * {DAV:}principal-search-property-set report. This report returns a list
     * of properties the client may search on, using the
     * {DAV:}principal-property-search report.
     *
     * @param DOMDocument $dom
     * @return void
     */
    this.principalSearchPropertySetReport = function(e, dom) {
        if (this.handler.getHTTPDepth(0) !== 0)
            return e.next(new Exc.jsDAV_Exception_BadRequest('This report is only defined when Depth: 0'));

        //if (dom.firstChild.childNodes) {
        //    return e.next(new Exc.jsDAV_Exception_BadRequest(
        //        'The principal-search-property-set report element is not allowed to have child elements'));
        //}
        //
        
        var newDom = '<?xml version="1.0" encoding="utf-8"?><d:principal-search-property-set';
        for(var namespace in this.handler.xmlNamespaces)
            newDom += ' xmlns:'+this.handler.xmlNamespaces[namespace]+'="'+namespace+'"';

        newDom += '>';

        for(var propName in this.principalSearchPropertySet) {
            var description = this.principalSearchPropertySet[propName];

            newDom += "<d:principal-search-property><d:prop>";

            propName = Util.fromClarkNotation(propName);
            
            // TODO: Handle other namespaces...
            var nodeName = this.handler.xmlNamespaces[propName[0]] + ":" + propName[1];
            newDom += "<"+nodeName+'/>';

            // TODO: Hardcoding the language is evil, too...
            newDom += '<d:description xml:lang="en">'+description+"</d:description>";
            newDom += "</d:prop></d:principal-search-property>";
        }

        newDom += "</d:principal-search-property-set>";

        this.handler.httpResponse.writeHead(200, {
            "Content-Type": "application/xml; charset=utf-8",
            "Content-Length": Buffer.byteLength(newDom)
        });
        this.handler.httpResponse.end(newDom);

        e.stop();
    }
    
}).call(jsDAV_DAVACL_Plugin.prototype = new jsDAV_ServerPlugin());

module.exports = jsDAV_DAVACL_Plugin;
