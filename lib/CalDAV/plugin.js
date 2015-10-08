/*
 * @package jsDAV
 * @subpackage CalDAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_Plugin = require("./../DAV/plugin");
var jsDAV_Property_Href = require("./../DAV/property/href");
var jsDAV_Property_HrefList = require("./../DAV/property/hrefList");
var jsDAV_Property_iHref = require("./../DAV/interfaces/iHref");
var jsCalDAV_iCalendar = require("./interfaces/iCalendar");
var jsCalDAV_iCalendarObject = require("./interfaces/iCalendarObject");
var jsDAVACL_iPrincipal = require("./../DAVACL/interfaces/iPrincipal");
var jsVObject_Reader = require("./../VObject/reader").new();
var jsCalDAV_CalendarQueryParser = require("./calendarQueryParser");
var jsCalDAV_CalendarQueryValidator = require("./calendarQueryValidator");

var AsyncEventEmitter = require("./../shared/asyncEvents").EventEmitter;
var Exc = require("./../shared/exceptions");
var Util = require("./../shared/util");
var Xml = require("./../shared/xml");

var Async = require("asyncjs");

var NS_CALDAV = "urn:ietf:params:xml:ns:caldav";
var NS_CALENDARSERVER = "http://calendarserver.org/ns/";


// Namespaces
Xml.xmlNamespaces[NS_CALDAV] = "cal";
Xml.xmlNamespaces[NS_CALENDARSERVER] = "cs";
Xml.xmlNamespaces["urn:DAV"] = "dav";

/**
 * CalDAV plugin
 *
 * The CalDAV plugin adds CalDAV functionality to the WebDAV server
 */
var jsCalDAV_Plugin = module.exports = jsDAV_Plugin.extend({
    /**
     * Plugin name
     *
     * @var String
     */
    name: "caldav",

    /**
     * Url to the calendars
     */
    CALENDAR_ROOT: "calendars",

    /**
     * xml namespace for CalDAV elements
     */
    NS_CALDAV: NS_CALDAV,

    NS_CALENDARSERVER: NS_CALENDARSERVER,

    /**
     * Handler class
     *
     * @var jsDAV_Handler
     */
    handler: null,


        /**
     * Use this method to tell the server this plugin defines additional
     * HTTP methods.
     *
     * This method is passed a uri. It should only return HTTP methods that are
     * available for the specified uri.
     *
     * @param string uri
     * @return array
     */
    getHTTPMethods: function(uri) {

        // The MKCALENDAR is only available on unmapped uri's, whose
        // parents extend IExtendedCollection

        // @TODO: check as described above, need to make getHTTPMethods async

        return ["MKCALENDAR"];

    },

    /**
     * Returns a list of supported features.
     *
     * This is used in the DAV: header in the OPTIONS and PROPFIND requests.
     *
     * @return array
     */
    getFeatures: function() {
        return ["calendar-access"];
    },


    /**
     * Returns a list of reports this plugin supports.
     *
     * This will be used in the {DAV:}supported-report-set property.
     * Note that you still need to subscribe to the 'report' event to actually
     * implement them
     *
     * @param {String} uri
     * @return array
     */
    getSupportedReportSet: function(uri, callback) {
        var self = this;
        this.handler.getNodeForPath(uri, function(err, node) {
            if (err)
                return callback(err);

            var reports = [];

            if (node.hasFeature(jsCalDAV_iCalendar) || node.hasFeature(jsCalDAV_iCalendarObject)) {
                reports.push("{" + self.NS_CALDAV + "}calendar-multiget");
                reports.push("{" + self.NS_CALDAV + "}calendar-query");
            }
            if (node.hasFeature(jsCalDAV_iCalendar)){
                reports.push("{" + self.NS_CALDAV + "}free-busy-query");
            }

            return callback(null, reports);
        });
    },

    /**
     * Initializes the plugin
     *
     * @param DAV\Server server
     * @return void
     */
    initialize: function(handler) {
        this.directories = [];

        // Events
        handler.addEventListener("unknownMethod", this.unknownMethod.bind(this))
        handler.addEventListener("report", this.report.bind(this));
        handler.addEventListener("beforeGetProperties", this.beforeGetProperties.bind(this));
        // handler.addEventListener("onHTMLActionsPanel", this.htmlActionsPanel.bind(this), AsyncEventEmitter.PRIO_HIGH);
        // handler.addEventListener("onBrowserPostAction", this.browserPostAction.bind(this), AsyncEventEmitter.PRIO_HIGH);
        handler.addEventListener("beforeWriteContent", this.beforeWriteContent.bind(this));
        handler.addEventListener("beforeCreateFile", this.beforeCreateFile.bind(this));
        // handler.addEventListener("beforeMethod", this.beforeMethod.bind(this));

        // Mapping Interfaces to {DAV:}resourcetype values
        handler.resourceTypeMapping["{" + this.NS_CALDAV + "}calendar"] = jsCalDAV_iCalendar;

        // Adding properties that may never be changed
        handler.protectedProperties.push(
            "{" + this.NS_CALDAV + "}supported-calendar-component-set",
            "{" + this.NS_CALDAV + "}supported-calendar-data",
            "{" + this.NS_CALDAV + "}max-resource-size",
            "{" + this.NS_CALDAV + "}min-date-time",
            "{" + this.NS_CALDAV + "}max-date-time",
            "{" + this.NS_CALDAV + "}max-instances",
            "{" + this.NS_CALDAV + "}max-attendees-per-instance",
            "{" + this.NS_CALDAV + "}calendar-home-set",
            "{" + this.NS_CALDAV + "}supported-collation-set",
            "{" + this.NS_CALDAV + "}calendar-data"
        );
        handler.protectedProperties = Util.makeUnique(handler.protectedProperties);

        handler.propertyMap["{http://calendarserver.org/ns/}me-card"] = jsDAV_Property_Href;

        this.handler = handler;
    },

    unknownMethod: function(method, uri, callback) {
        if (method === "MKCALENDAR"){
            this.httpMkCalendar(uri);
            return callback(true);
        }
        return callback(false);
    },

    /**
     * This functions handles REPORT requests specific to CalDAV
     *
     * @param {String} reportName
     * @param DOMNode dom
     * @return bool
     */
    report: function(e, reportName, dom) {
        switch(reportName) {
            case "{" + this.NS_CALDAV + "}calendar-multiget" :
                this.calendarMultiGetReport(e, dom);
                break;
            case "{" + this.NS_CALDAV + "}calendar-query" :
                this.calendarQueryReport(e, dom);
                break;
            /*case "{" + this.NS_CALDAV + "}free-busy-query" :
                this.freeBusyQueryReport(e, dom);
                break;*/
            default :
                return e.next();
        }
    },

    httpMkCalendar: function(uri){

        // @TODO: JS ME

        // Due to unforgivable bugs in iCal, we're completely disabling MKCALENDAR support
        // for clients matching iCal in the user agent
        //$ua = $this->server->httpRequest->getHeader('User-Agent');
        //if (strpos($ua,'iCal/')!==false) {
        //    throw new \Sabre\DAV\Exception\Forbidden('iCal has major bugs in it\'s RFC3744 support. Therefore we are left with no other choice but disabling this feature.');
        //}

        // $body = $this->server->httpRequest->getBody(true);
        // $properties = array();

        // if ($body) {

        //     $dom = DAV\XMLUtil::loadDOMDocument($body);

        //     foreach($dom->firstChild->childNodes as $child) {

        //         if (DAV\XMLUtil::toClarkNotation($child)!=='{DAV:}set') continue;
        //         foreach(DAV\XMLUtil::parseProperties($child,$this->server->propertyMap) as $k=>$prop) {
        //             $properties[$k] = $prop;
        //         }

        //     }
        // }

        // $resourceType = array('{DAV:}collection','{urn:ietf:params:xml:ns:caldav}calendar');

        // $this->server->createCollection($uri,$resourceType,$properties);

        // $this->server->httpResponse->sendStatus(201);
        // $this->server->httpResponse->setHeader('Content-Length',0);

        this.handler.httpResponse.writeHead(500);
        this.handler.httpResponse.end("Not Implemented Yet");
    },

    /**
     * Adds all CalDAV-specific properties
     *
     * @param {String} path
     * @param DAV\INode node
     * @param {Array} requestedProperties
     * @param {Array} returnedProperties
     * @return void
     */
    beforeGetProperties: function(e, path, node, requestedProperties, returnedProperties) {
        var self = this;
        if (node.hasFeature(jsDAVACL_iPrincipal)) {
            // calendar-home-set property
            var calHome = "{" + this.NS_CALDAV + "}calendar-home-set";
            if (requestedProperties[calHome]) {
                var principalId = node.getName();
                var calendarHomePath = this.CALENDAR_ROOT + "/" + principalId + "/";
                delete requestedProperties[calHome];
                returnedProperties["200"][calHome] = jsDAV_Property_Href.new(calendarHomePath);
            }
            e.next();
        }

        if (node.hasFeature(jsCalDAV_iCalendarObject)) {
            // The address-data property is not supposed to be a 'real'
            // property, but in large chunks of the spec it does act as such.
            // Therefore we simply expose it as a property.
            var calendarDataProp = "{" + this.NS_CALDAV + "}calendar-data";
            if (requestedProperties[calendarDataProp]) {
                delete requestedProperties[calendarDataProp];
                node.get(function(err, val) {
                    if (err)
                        return e.next(err);
                    returnedProperties["200"][calendarDataProp] = val.toString("utf8");
                    e.next();
                });
            } else
                e.next();

        } else
            e.next();
    },

    /**
     * This function handles the calendar-multiget REPORT.
     *
     * This report is used by the client to fetch the content of a series
     * of urls. Effectively avoiding a lot of redundant requests.
     *
     * @param DOMNode dom
     * @return void
     */
    calendarMultiGetReport: function(e, dom) {
        var properties = Object.keys(Xml.parseProperties(dom));

        var hrefElems = dom.getElementsByTagNameNS("urn:DAV", "href");
        var propertyList = {};
        var self = this;

        Async.list(hrefElems)
            .each(function(elem, next) {
                var uri = self.handler.calculateUri(elem.firstChild.nodeValue);
                //propertyList[uri]
                self.handler.getPropertiesForPath(uri, properties, 0, function(err, props) {
                    if (err)
                        return next(err);

                    Util.extend(propertyList, props);
                    next();
                });
            })
            .end(function(err) {
                if (err)
                    return e.next(err);

                var prefer = self.handler.getHTTPPrefer();

                e.stop();
                self.handler.httpResponse.writeHead(207, {
                    "content-type": "application/xml; charset=utf-8",
                    "vary": "Brief,Prefer"
                });
                self.handler.httpResponse.end(self.handler.generateMultiStatus(propertyList, prefer["return-minimal"]));
            });
    },

    /**
     * This method is triggered before a file gets updated with new content.
     *
     * This plugin uses this method to ensure that Calendar nodes receive valid
     * ical data.
     *
     * @param {String} path
     * @param jsDAV_iFile node
     * @param resource data
     * @return void
     */
    beforeWriteContent: function(e, path, node) {
        if (!node.hasFeature(jsCalDAV_iCalendar))
            return e.next();

        var self = this;
        this.handler.getRequestBody("utf8", null, false, function(err, data) {
            if (err)
                return e.next(err);
            try {
                self.validateICal(data);
            }
            catch (ex) {
                return e.next(ex);
            }

            e.next();
        });
    },

    /**
     * This method is triggered before a new file is created.
     *
     * This plugin uses this method to ensure that Calendar nodes receive valid
     * ical data.
     *
     * @param {String} path
     * @param resource data
     * @param jsDAV_iCollection parentNode
     * @return void
     */
    beforeCreateFile: function(e, path, data, enc, parentNode) {
        if (!parentNode.hasFeature(jsCalDAV_iCalendar)) {
            return e.next();
        }
        var self = this;
        this.handler.getRequestBody("utf8", null, false, function(err, data) {
            if (err)
                return e.next(err);

            try {
                self.validateICal(data);
            }
            catch (ex) {
                return e.next(ex);
            }
            e.next();
        });


    },

    /**
     * Checks if the submitted iCalendar data is in fact, valid.
     *
     * An exception is thrown if it's not.
     *
     * @param resource|string data
     * @return void
     */
    validateICal: function(data) {
        // If it's a stream, we convert it to a string first.
        if (Buffer.isBuffer(data))
            data = data.toString("utf8");

        var vobj;
        try {
            vobj = jsVObject_Reader.read(data);
        }
        catch (ex) {
            throw new Exc.UnsupportedMediaType("This resource only supports valid vcalendar data. Parse error: " + ex.message);
        }

        if (vobj.name != "VCALENDAR")
            throw new Exc.UnsupportedMediaType("This collection can only support vcalendar objects.");

    },

     /**
      * This function handles the calendar-query REPORT
      *
      * This report is used by the client to filter an calendar based on a
      * complex query.
      *
      * @param e
      * @param {Node} dom
      * @returns {*}
      */
    calendarQueryReport: function(e, dom) {
         var query = jsCalDAV_CalendarQueryParser.new(dom);
         var validator = jsCalDAV_CalendarQueryValidator.new();
         var self = this;
         var depth = this.handler.getHTTPDepth(0);

         try {
             query.parse();
         }
         catch (ex) {
             return e.next(ex);
         }

         this.handler.getNodeForPath(this.handler.getRequestUri(), function(err, node) {
             if (err)
                 return e.next(err);

             // The calendarobject was requested directly. In this case we handle
             // this locally.
             if (depth == 0 && node.hasFeature(jsCalDAV_iCalendarObject)) {
                afterCandidates([ node ]);
             }
             // If we're dealing with a calendar, the calendar itself is responsible
             // for the calendar-query.
             else if (node.hasFeature(jsCalDAV_iCalendar)) {
                node.calendarQuery(query.filters, function(err, items){
                    if (err)
                        return e.next(err);
                    afterCandidates(items);
                });
             }
             else {
                e.next(Exc.notImplementedYet());
             }
         });

         function afterCandidates(candidateNodes) {
             var validNodes = [];

             Async.list(candidateNodes).each(function(node, next) {
                 if (!node.hasFeature(jsCalDAV_iCalendarObject)) {
                     // somehow we got here not a calendar object...
                     next();
                 }
                 else {
                     // Step 1 - is depth == 0 calendar node is requested pass it through validator
                     // if not (depth == 1) just save a node as valid (it is from calendar query)
                     if (depth == 0) {
                         node.get(function(err, blob) {
                             if (err)
                                 return next(err);

                             var vObject = jsVObject_Reader.read(blob.toString("utf8"));

                             if (!validator.validate(vObject, query.filters))
                                return next();

                             validNodes.push(node);
                             next();
                         });
                     }
                     else {
                         validNodes.push(node);
                         next();
                     }
                 }
             })
             .end(function(err) {
                 if (err)
                     return e.next(err);

                 // validNodes contains result of a calendar query or a single valid node...
                 var result = {};
                 Async.list(validNodes).each(function(validNode, next) {
                     var href = self.handler.getRequestUri();
                     if (depth !== 0)
                         href = href + "/" + validNode.getName();

                     // get each node properties, pass to result object
                     self.handler.getPropertiesForPath(href, query.requestedProperties, 0, function(err, props) {
                         if (err)
                             return next(err);

                         Util.extend(result, props);
                         next();
                     });
                 })
                 .end(function(err) {

                     if (err)
                         return e.next(err);

                     e.stop();

                     var prefer = self.handler.getHTTPPrefer();

                     self.handler.httpResponse.writeHead(207, {
                         "content-type": "application/xml; charset=utf-8",
                         "vary": "Brief,Prefer"
                     });
                     self.handler.httpResponse.end(self.handler.generateMultiStatus(result, prefer["return-minimal"]));
                 });
             });
         }
     }

    // /**
    //  * Validates if a vcard makes it throught a list of filters.
    //  *
    //  * @param {String} vcardData
    //  * @param {Array} filters
    //  * @param {String} test anyof or allof (which means OR or AND)
    //  * @return bool
    //  */
    // validateFilters: function(vcardData, filters, test) {
    //     var vcard;
    //     try {
    //         vcard = jsVObject_Reader.read(vcardData);
    //     }
    //     catch (ex) {
    //         return false;
    //     }

    //     if (!filters)
    //         return true;

    //     var filter, isDefined, success, vProperties, results, texts;
    //     for (var i = 0, l = filters.length; i < l; ++i) {
    //         filter = filters[i];

    //         isDefined = vcard.get(filter.name);
    //         if (filter["is-not-defined"]) {
    //             if (isDefined)
    //                 success = false;
    //             else
    //                 success = true;
    //         }
    //         else if ((!filter["param-filters"] && !filter["text-matches"]) || !isDefined) {
    //             // We only need to check for existence
    //             success = isDefined;
    //         }
    //         else {
    //             vProperties = vcard.select(filter.name);

    //             results = [];
    //             if (filter["param-filters"])
    //                 results.push(this.validateParamFilters(vProperties, filter["param-filters"], filter.test));
    //             if (filter["text-matches"]) {
    //                 texts = vProperties.map(function(vProperty) {
    //                     return vProperty.value;
    //                 });

    //                 results.push(this.validateTextMatches(texts, filter["text-matches"], filter.test));
    //             }

    //             if (results.length === 1) {
    //                 success = results[0];
    //             }
    //             else {
    //                 if (filter.test == "anyof")
    //                     success = results[0] || results[1];
    //                 else
    //                     success = results[0] && results[1];
    //             }
    //         } // else

    //         // There are two conditions where we can already determine whether
    //         // or not this filter succeeds.
    //         if (test == "anyof" && success)
    //             return true;
    //         if (test == "allof" && !success)
    //             return false;
    //     } // foreach

    //     // If we got all the way here, it means we haven't been able to
    //     // determine early if the test failed or not.
    //     //
    //     // This implies for 'anyof' that the test failed, and for 'allof' that
    //     // we succeeded. Sounds weird, but makes sense.
    //     return test === "allof";
    // },

    // /**
    //  * Validates if a param-filter can be applied to a specific property.
    //  *
    //  * @todo currently we're only validating the first parameter of the passed
    //  *       property. Any subsequence parameters with the same name are
    //  *       ignored.
    //  * @param {Array} vProperties
    //  * @param {Array} filters
    //  * @param {String} test
    //  * @return bool
    //  */
    // validateParamFilters: function(vProperties, filters, test) {
    //     var filter, isDefined, success, j, l2, vProperty;
    //     for (var i = 0, l = filters.length; i < l; ++i) {
    //         filter = filters[i];
    //         isDefined = false;
    //         for (j = 0, l2 = vProperties.length; j < l2; ++j) {
    //             vProperty = vProperties[j];
    //             isDefined = !!vProperty.get(filter.name);
    //             if (isDefined)
    //                 break;
    //         }

    //         if (filter["is-not-defined"]) {
    //             success = !isDefined;
    //         // If there's no text-match, we can just check for existence
    //         }
    //         else if (!filter["text-match"] || !isDefined) {
    //             success = isDefined;
    //         }
    //         else {
    //             success = false;
    //             for (j = 0, l2 = vProperties.length; j < l2; ++j) {
    //                 vProperty = vProperties[j];
    //                 // If we got all the way here, we'll need to validate the
    //                 // text-match filter.
    //                 success = Util.textMatch(vProperty.get(filter.name).value, filter["text-match"].value, filter["text-match"]["match-type"]);
    //                 if (success)
    //                     break;
    //             }
    //             if (filter["text-match"]["negate-condition"])
    //                 success = !success;
    //         } // else

    //         // There are two conditions where we can already determine whether
    //         // or not this filter succeeds.
    //         if (test == "anyof" && success)
    //             return true;
    //         if (test == "allof" && !success)
    //             return false;
    //     }

    //     // If we got all the way here, it means we haven't been able to
    //     // determine early if the test failed or not.
    //     //
    //     // This implies for 'anyof' that the test failed, and for 'allof' that
    //     // we succeeded. Sounds weird, but makes sense.
    //     return test == "allof";
    // },

    // /**
    //  * Validates if a text-filter can be applied to a specific property.
    //  *
    //  * @param {Array} texts
    //  * @param {Array} filters
    //  * @param {String} test
    //  * @return bool
    //  */
    // validateTextMatches: function(texts, filters, test) {
    //     var success, filter, j, l2, haystack;
    //     for (var i = 0, l = filters.length; i < l; ++i) {
    //         filter = filters[i];

    //         success = false;
    //         for (j = 0, l2 = texts.length; j < l2; ++j) {
    //             haystack = texts[j];
    //             success = Util.textMatch(haystack, filter.value, filter["match-type"]);
    //             // Breaking on the first match
    //             if (success)
    //                 break;
    //         }
    //         if (filter["negate-condition"])
    //             success = !success;

    //         if (success && test == "anyof")
    //             return true;

    //         if (!success && test == "allof")
    //             return false;
    //     }

    //     // If we got all the way here, it means we haven't been able to
    //     // determine early if the test failed or not.
    //     //
    //     // This implies for 'anyof' that the test failed, and for 'allof' that
    //     // we succeeded. Sounds weird, but makes sense.
    //     return test == "allof";
    // },

    // /**
    //  * This event is triggered after webdav-properties have been retrieved.
    //  *
    //  * @return bool
    //  */
    // afterGetProperties: function(e, uri, properties) {
    //     // If the request was made using the SOGO connector, we must rewrite
    //     // the content-type property. By default jsDAV will send back
    //     // text/x-vcard; charset=utf-8, but for SOGO we must strip that last
    //     // part.
    //     if (!properties["200"]["{DAV:}getcontenttype"])
    //         return e.next();

    //     if (this.handler.httpRequest.headers["user-agent"].indexOf("Thunderbird") === -1)
    //         return e.next();

    //     if (properties["200"]["{DAV:}getcontenttype"].indexOf("text/x-vcard") === 0)
    //         properties["200"]["{DAV:}getcontenttype"] = "text/x-vcard";

    //     e.next();
    // },

    /**
     * This method is used to generate HTML output for the
     * Sabre\DAV\Browser\Plugin. This allows us to generate an interface users
     * can use to create new calendars.
     *
     * @param DAV\INode node
     * @param {String} output
     * @return bool
     */
    // htmlActionsPanel: function(e, node, output) {
    //     if (!node.hasFeature(jsCalDAV_UserAddressBooks))
    //         return e.next();

    //     output.html = '<tr><td colspan="2"><form method="post" action="">' +
    //         '<h3>Create new address book</h3>' +
    //         '<input type="hidden" name="jsdavAction" value="mkcalendar" />' +
    //         '<label>Name (uri):</label> <input type="text" name="name" /><br />' +
    //         '<label>Display name:</label> <input type="text" name="{DAV:}displayname" /><br />' +
    //         '<input type="submit" value="create" />' +
    //         '</form>' +
    //         '</td></tr>';

    //     e.stop();
    // },

    // *
    //  * This method allows us to intercept the 'mkcalendar' sabreAction. This
    //  * action enables the user to create new calendars from the browser plugin.
    //  *
    //  * @param {String} uri
    //  * @param {String} action
    //  * @param {Array} postVars
    //  * @return bool

    // browserPostAction: function(e, uri, action, postVars) {
    //     if (action != "mkcalendar")
    //         return e.next();

    //     var resourceType = ["{DAV:}collection", "{urn:ietf:params:xml:ns:carddav}calendar"];
    //     var properties = {};
    //     if (postVars["{DAV:}displayname"])
    //         properties["{DAV:}displayname"] = postVars["{DAV:}displayname"];

    //     this.handler.createCollection(uri + "/" + postVars.name, resourceType, properties, function(err) {
    //         if (err)
    //             return e.next(err);
    //         e.stop();
    //     });
    // }
});
