/*
 * @package jsDAV
 * @subpackage CardDAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_Plugin = require("./../DAV/plugin");
var jsDAV_Property_Href = require("./../DAV/property/href");
var jsDAV_Property_HrefList = require("./../DAV/property/hrefList");
var jsDAV_Property_iHref = require("./../DAV/interfaces/iHref");
var jsCardDAV_iAddressBook = require("./interfaces/iAddressBook");
var jsCardDAV_iCard = require("./interfaces/iCard");
var jsCardDAV_iDirectory = require("./interfaces/iDirectory");
var jsCardDAV_UserAddressBooks = require("./userAddressBooks");
var jsCardDAV_AddressBookQueryParser = require("./addressBookQueryParser");
var jsDAVACL_iPrincipal = require("./../DAVACL/interfaces/iPrincipal");
var jsVObject_Reader = require("./../VObject/reader");

var AsyncEventEmitter = require("./../shared/asyncEvents").EventEmitter;
var Exc = require("./../shared/exceptions");
var Util = require("./../shared/util");
var Xml = require("./../shared/xml");

var Async = require("asyncjs");

/**
 * CardDAV plugin
 *
 * The CardDAV plugin adds CardDAV functionality to the WebDAV server
 */
var jsCardDAV_Plugin = module.exports = jsDAV_Plugin.extend({
    /**
     * Plugin name
     *
     * @var String
     */
    name: "carddav",

    /**
     * Url to the addressbooks
     */
    ADDRESSBOOK_ROOT: "addressbooks",

    /**
     * xml namespace for CardDAV elements
     */
    NS_CARDDAV: "urn:ietf:params:xml:ns:carddav",

    /**
     * Add urls to this property to have them automatically exposed as
     * 'directories' to the user.
     *
     * @var array
     */
    directories: null,

    /**
     * Handler class
     *
     * @var jsDAV_Handler
     */
    handler: null,

    /**
     * Initializes the plugin
     *
     * @param DAV\Server server
     * @return void
     */
    initialize: function(handler) {
        this.directories = [];

        // Events
        handler.addEventListener("beforeGetProperties", this.beforeGetProperties.bind(this));
        handler.addEventListener("afterGetProperties",  this.afterGetProperties.bind(this));
        handler.addEventListener("updateProperties", this.updateProperties.bind(this));
        handler.addEventListener("report", this.report.bind(this));
        handler.addEventListener("onHTMLActionsPanel", this.htmlActionsPanel.bind(this), AsyncEventEmitter.PRIO_HIGH);
        handler.addEventListener("onBrowserPostAction", this.browserPostAction.bind(this), AsyncEventEmitter.PRIO_HIGH);
        handler.addEventListener("beforeWriteContent", this.beforeWriteContent.bind(this));
        handler.addEventListener("beforeCreateFile", this.beforeCreateFile.bind(this));

        // Namespaces
        Xml.xmlNamespaces[this.NS_CARDDAV] = "card";

        // Mapping Interfaces to {DAV:}resourcetype values
        handler.resourceTypeMapping["{" + this.NS_CARDDAV + "}addressbook"] = jsCardDAV_iAddressBook;
        handler.resourceTypeMapping["{" + this.NS_CARDDAV + "}directory"] = jsCardDAV_iDirectory;

        // Adding properties that may never be changed
        handler.protectedProperties.push(
            "{" + this.NS_CARDDAV + "}supported-address-data",
            "{" + this.NS_CARDDAV + "}max-resource-size",
            "{" + this.NS_CARDDAV + "}addressbook-home-set",
            "{" + this.NS_CARDDAV + "}supported-collation-set"
        );
        handler.protectedProperties = Util.makeUnique(handler.protectedProperties);

        handler.propertyMap["{http://calendarserver.org/ns/}me-card"] = jsDAV_Property_Href;

        this.handler = handler;
    },

    /**
     * Returns a list of supported features.
     *
     * This is used in the DAV: header in the OPTIONS and PROPFIND requests.
     *
     * @return array
     */
    getFeatures: function() {
        return ["addressbook"];
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

            if (node.hasFeature(jsCardDAV_iAddressBook) || node.hasFeature(jsCardDAV_iCard)) {
                return callback(null, [
                     "{" + self.NS_CARDDAV + "}addressbook-multiget",
                     "{" + self.NS_CARDDAV + "}addressbook-query"
                ]);
            }
            return callback(null, []);
        });
    },

    /**
     * Adds all CardDAV-specific properties
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
            var addHome = "{" + this.NS_CARDDAV + "}addressbook-home-set";
            if (requestedProperties[addHome]) {
                var principalId = node.getName();
                var addressbookHomePath = this.ADDRESSBOOK_ROOT + "/" + principalId + "/";
                delete requestedProperties[addHome];
                returnedProperties["200"][addHome] = jsDAV_Property_Href.new(addressbookHomePath);
            }

            var directories = "{" + this.NS_CARDDAV + "}directory-gateway";
            if (this.directories && requestedProperties[directories]) {
                delete requestedProperties[directories];
                returnedProperties["200"][directories] = jsDAV_Property_HrefList.new(this.directories);
            }

        }

        if (node.hasFeature(jsCardDAV_iCard)) {
            // The address-data property is not supposed to be a 'real'
            // property, but in large chunks of the spec it does act as such.
            // Therefore we simply expose it as a property.
            var addressDataProp = "{" + this.NS_CARDDAV + "}address-data";
            if (requestedProperties[addressDataProp]) {
                delete requestedProperties[addressDataProp];
                node.get(function(err, val) {
                    if (err)
                        return e.next(err);
                    returnedProperties["200"][addressDataProp] = val.toString("utf8");
                    afterICard();
                });
            }
            else
                afterICard();
        }
        else
            afterICard();

        function afterICard() {
            if (node.hasFeature(jsCardDAV_UserAddressBooks)) {
                var meCardProp = "{http://calendarserver.org/ns/}me-card";
                if (requestedProperties[meCardProp]) {
                    self.handler.getProperties(node.getOwner(), ["{http://ajax.org/2005/aml}vcard-url"], function(err, props) {
                        if (err)
                            return e.next(err);

                        if (props["{http://ajax.org/2005/aml}vcard-url"]) {
                            returnedProperties["200"][meCardProp] = jsDAV_Property_Href.new(
                                props["{http://ajax.org/2005/aml}vcard-url"]
                            );
                            delete requestedProperties[meCardProp];
                        }
                        e.next();
                    });
                }
                else
                    e.next();
            }
            else
                e.next();
        }
    },

    /**
     * This event is triggered when a PROPPATCH method is executed
     *
     * @param {Array} mutations
     * @param {Array} result
     * @param DAV\INode node
     * @return bool
     */
    updateProperties: function(e, mutations, result, node) {
        if (!node.hasFeature(jsCardDAV_UserAddressBooks))
            return e.next();

        var meCard = "{http://calendarserver.org/ns/}me-card";

        // The only property we care about
        if (!mutations[meCard])
            return e.next();

        var value = mutations[meCard];
        delete mutations[meCard];

        if (value.hasFeature(jsDAV_Property_iHref)) {
            value = this.handler.calculateUri(value.getHref());
        }
        else if (!value) {
            result["400"][meCard] = null;
            return e.stop();
        }

        this.server.updateProperties(node.getOwner(), {"{http://ajax.org/2005/aml}vcard-url": value}, function(err, innerResult) {
            if (err)
                return e.next(err);

            var closureResult = false;
            var props;
            for (var status in innerResult) {
                props = innerResult[status];
                if (props["{http://ajax.org/2005/aml}vcard-url"]) {
                    result[status][meCard] = null;
                    status = parseInt(status);
                    closureResult = (status >= 200 && status < 300);
                }
            }

            if (!closureResult)
                return e.stop();
            e.next();
        });
    },

    /**
     * This functions handles REPORT requests specific to CardDAV
     *
     * @param {String} reportName
     * @param DOMNode dom
     * @return bool
     */
    report: function(e, reportName, dom) {
        switch(reportName) {
            case "{" + this.NS_CARDDAV + "}addressbook-multiget" :
                this.addressbookMultiGetReport(e, dom);
                break;
            case "{" + this.NS_CARDDAV + "}addressbook-query" :
                this.addressBookQueryReport(e, dom);
                break;
            default :
                return e.next();
        }
    },

    /**
     * This function handles the addressbook-multiget REPORT.
     *
     * This report is used by the client to fetch the content of a series
     * of urls. Effectively avoiding a lot of redundant requests.
     *
     * @param DOMNode dom
     * @return void
     */
    addressbookMultiGetReport: function(e, dom) {
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
     * This plugin uses this method to ensure that Card nodes receive valid
     * vcard data.
     *
     * @param {String} path
     * @param jsDAV_iFile node
     * @param resource data
     * @return void
     */
    beforeWriteContent: function(e, path, node) {
        if (!node.hasFeature(jsCardDAV_iCard))
            return e.next();

        var self = this;
        this.handler.getRequestBody("utf8", null, false, function(err, data) {
            if (err)
                return e.next(err);

            try {
                self.validateVCard(data);
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
     * This plugin uses this method to ensure that Card nodes receive valid
     * vcard data.
     *
     * @param {String} path
     * @param resource data
     * @param jsDAV_iCollection parentNode
     * @return void
     */
    beforeCreateFile: function(e, path, data, enc, parentNode) {
        if (!parentNode.hasFeature(jsCardDAV_iAddressBook))
            return e.next();

        try {
            this.validateVCard(data);
        }
        catch (ex) {
            return e.next(ex);
        }

        e.next();
    },

    /**
     * Checks if the submitted iCalendar data is in fact, valid.
     *
     * An exception is thrown if it's not.
     *
     * @param resource|string data
     * @return void
     */
    validateVCard: function(data) {
        // If it's a stream, we convert it to a string first.
        if (Buffer.isBuffer(data))
            data = data.toString("utf8");

        var vobj;
        try {
            vobj = jsVObject_Reader.read(data);
        }
        catch (ex) {
            throw new Exc.UnsupportedMediaType("This resource only supports valid vcard data. Parse error: " + ex.message);
        }

        if (vobj.name != "VCARD")
            throw new Exc.UnsupportedMediaType("This collection can only support vcard objects.");

        if (!vobj.UID)
            throw new Exc.BadRequest("Every vcard must have a UID.");
    },

    /**
     * This function handles the addressbook-query REPORT
     *
     * This report is used by the client to filter an addressbook based on a
     * complex query.
     *
     * @param DOMNode dom
     * @return void
     */
    addressbookQueryReport: function(e, dom) {
        var query = jsCardDAV_AddressBookQueryParser.new(dom);
        try {
            query.parse();
        }
        catch(ex) {
            return e.next(ex);
        }

        var depth = this.handler.getHTTPDepth(0);

        if (depth === 0) {
            this.handler.getNodeForPath(this.handler.getRequestUri(), function(err, node) {
                if (err)
                    return e.next(err);
                afterCandidates([node]);
            })
        }
        else {
            this.handler.server.tree.getChildren(this.handler.getRequestUri(), function(err, children) {
                if (err)
                    return e.next(err);
                afterCandidates(children);
            });
        }

        var self = this;
        function afterCandidates(candidateNodes) {
            var validNodes = [];

            Async.list(candidateNodes)
                .each(function(node, next) {
                    if (!node.hasFeature(jsCardDAV_iCard))
                        return next();

                    node.get(function(err, blob) {
                        if (err)
                            return next(err);

                        if (!self.validateFilters(blob.toString("utf8"), query.filters, query.test))
                            return next();

                        validNodes.push(node);

                        if (query.limit && query.limit <= validNodes.length) {
                            // We hit the maximum number of items, we can stop now.
                            return next(Async.STOP);
                        }

                        next();
                    });
                })
                .end(function(err) {
                    if (err)
                        return e.next(err);

                    var result = {};
                    Async.list(validNodes)
                        .each(function(validNode, next) {
                            var href = self.handler.getRequestUri();
                            if (depth !== 0)
                                href = href + "/" + validNode.getName();

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
                            var prefer = self.handler.getHTTPPRefer();

                            self.handler.httpResponse.writeHead(207, {
                                "content-type": "application/xml; charset=utf-8",
                                "vary": "Brief,Prefer"
                            });
                            self.handler.httpResponse.end(self.handler.generateMultiStatus(result, prefer["return-minimal"]));
                        });
                });
        }
    },

    /**
     * Validates if a vcard makes it throught a list of filters.
     *
     * @param {String} vcardData
     * @param {Array} filters
     * @param {String} test anyof or allof (which means OR or AND)
     * @return bool
     */
    validateFilters: function(vcardData, filters, test) {
        var vcard;
        try {
            vcard = jsVObject_Reader.read(vcardData);
        }
        catch (ex) {
            return false;
        }

        if (!filters)
            return true;

        var filter, isDefined, success, vProperties, results, texts;
        for (var i = 0, l = filters.length; i < l; ++i) {
            filter = filters[i];

            isDefined = vcard.get(filter.name);
            if (filter["is-not-defined"]) {
                if (isDefined)
                    success = false;
                else
                    success = true;
            }
            else if ((!filter["param-filters"] && !filter["text-matches"]) || !isDefined) {
                // We only need to check for existence
                success = isDefined;
            }
            else {
                vProperties = vcard.select(filter.name);

                results = [];
                if (filter["param-filters"])
                    results.push(this.validateParamFilters(vProperties, filter["param-filters"], filter.test));
                if (filter["text-matches"]) {
                    texts = vProperties.map(function(vProperty) {
                        return vProperty.value;
                    });

                    results.push(this.validateTextMatches(texts, filter["text-matches"], filter.test));
                }

                if (results.length === 1) {
                    success = results[0];
                }
                else {
                    if (filter.test == "anyof")
                        success = results[0] || results[1];
                    else
                        success = results[0] && results[1];
                }
            } // else

            // There are two conditions where we can already determine whether
            // or not this filter succeeds.
            if (test == "anyof" && success)
                return true;
            if (test == "allof" && !success)
                return false;
        } // foreach

        // If we got all the way here, it means we haven't been able to
        // determine early if the test failed or not.
        //
        // This implies for 'anyof' that the test failed, and for 'allof' that
        // we succeeded. Sounds weird, but makes sense.
        return test === "allof";
    },

    /**
     * Validates if a param-filter can be applied to a specific property.
     *
     * @todo currently we're only validating the first parameter of the passed
     *       property. Any subsequence parameters with the same name are
     *       ignored.
     * @param {Array} vProperties
     * @param {Array} filters
     * @param {String} test
     * @return bool
     */
    validateParamFilters: function(vProperties, filters, test) {
        var filter, isDefined, success, j, l2, vProperty;
        for (var i = 0, l = filters.length; i < l; ++i) {
            filter = filters[i];
            isDefined = false;
            for (j = 0, l2 = vProperties.length; j < l2; ++j) {
                vProperty = vProperties[j];
                isDefined = !!vProperty.get(filter.name);
                if (isDefined)
                    break;
            }

            if (filter["is-not-defined"]) {
                success = !isDefined;
            // If there's no text-match, we can just check for existence
            }
            else if (!filter["text-match"] || !isDefined) {
                success = isDefined;
            }
            else {
                success = false;
                for (j = 0, l2 = vProperties.length; j < l2; ++j) {
                    vProperty = vProperties[j];
                    // If we got all the way here, we'll need to validate the
                    // text-match filter.
                    success = Util.textMatch(vProperty.get(filter.name).value, filter["text-match"].value, filter["text-match"]["match-type"]);
                    if (success)
                        break;
                }
                if (filter["text-match"]["negate-condition"])
                    success = !success;
            } // else

            // There are two conditions where we can already determine whether
            // or not this filter succeeds.
            if (test == "anyof" && success)
                return true;
            if (test == "allof" && !success)
                return false;
        }

        // If we got all the way here, it means we haven't been able to
        // determine early if the test failed or not.
        //
        // This implies for 'anyof' that the test failed, and for 'allof' that
        // we succeeded. Sounds weird, but makes sense.
        return test == "allof";
    },

    /**
     * Validates if a text-filter can be applied to a specific property.
     *
     * @param {Array} texts
     * @param {Array} filters
     * @param {String} test
     * @return bool
     */
    validateTextMatches: function(texts, filters, test) {
        var success, filter, j, l2, haystack;
        for (var i = 0, l = filters.length; i < l; ++i) {
            filter = filters[i];

            success = false;
            for (j = 0, l2 = texts.length; j < l2; ++j) {
                haystack = texts[j];
                success = Util.textMatch(haystack, filter.value, filter["match-type"]);
                // Breaking on the first match
                if (success)
                    break;
            }
            if (filter["negate-condition"])
                success = !success;

            if (success && test == "anyof")
                return true;

            if (!success && test == "allof")
                return false;
        }

        // If we got all the way here, it means we haven't been able to
        // determine early if the test failed or not.
        //
        // This implies for 'anyof' that the test failed, and for 'allof' that
        // we succeeded. Sounds weird, but makes sense.
        return test == "allof";
    },

    /**
     * This event is triggered after webdav-properties have been retrieved.
     *
     * @return bool
     */
    afterGetProperties: function(e, uri, properties) {
        // If the request was made using the SOGO connector, we must rewrite
        // the content-type property. By default jsDAV will send back
        // text/x-vcard; charset=utf-8, but for SOGO we must strip that last
        // part.
        if (!properties["200"]["{DAV:}getcontenttype"])
            return e.next();

        var ua = this.handler.httpRequest.headers["user-agent"];
        if (!ua || ua.indexOf("Thunderbird") === -1)
            return e.next();

        if (properties["200"]["{DAV:}getcontenttype"].indexOf("text/x-vcard") === 0)
            properties["200"]["{DAV:}getcontenttype"] = "text/x-vcard";

        e.next();
    },

    /**
     * This method is used to generate HTML output for the
     * Sabre\DAV\Browser\Plugin. This allows us to generate an interface users
     * can use to create new calendars.
     *
     * @param DAV\INode node
     * @param {String} output
     * @return bool
     */
    htmlActionsPanel: function(e, node, output) {
        if (!node.hasFeature(jsCardDAV_UserAddressBooks))
            return e.next();

        output.html = '<tr><td colspan="2"><form method="post" action="">' +
            '<h3>Create new address book</h3>' +
            '<input type="hidden" name="jsdavAction" value="mkaddressbook" />' +
            '<label>Name (uri):</label> <input type="text" name="name" /><br />' +
            '<label>Display name:</label> <input type="text" name="{DAV:}displayname" /><br />' +
            '<input type="submit" value="create" />' +
            '</form>' +
            '</td></tr>';

        e.stop();
    },

    /**
     * This method allows us to intercept the 'mkcalendar' sabreAction. This
     * action enables the user to create new calendars from the browser plugin.
     *
     * @param {String} uri
     * @param {String} action
     * @param {Array} postVars
     * @return bool
     */
    browserPostAction: function(e, uri, action, postVars) {
        if (action != "mkaddressbook")
            return e.next();

        var resourceType = ["{DAV:}collection", "{urn:ietf:params:xml:ns:carddav}addressbook"];
        var properties = {};
        if (postVars["{DAV:}displayname"])
            properties["{DAV:}displayname"] = postVars["{DAV:}displayname"];

        this.handler.createCollection(uri + "/" + postVars.name, resourceType, properties, function(err) {
            if (err)
                return e.next(err);
            e.stop();
        });
    }
});
