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
var jsCardDAV_iAddressBook = require("./interfaces/iAddressBook");
var jsCardDAV_iCard = require("./interfaces/iCard");
var jsCardDAV_iDirectory = require("./interfaces/iDirectory");

var Exc = require("./../shared/exceptions");
var Util = require("./../shared/util");
var Xml = require("./../shared/xml");

/**
 * CardDAV plugin
 *
 * The CardDAV plugin adds CardDAV functionality to the WebDAV server
 */
var jsCardDAV_Plugin = module.exports = jsDAV_Plugin.extend({
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
        
        /* Events */
        handler.addEventListener("beforeGetProperties", this.beforeGetProperties.bind(this));
        handler.addEventListener("afterGetProperties",  this.afterGetProperties.bind(this));
        handler.addEventListener("updateProperties", this.updateProperties.bind(this));
        handler.addEventListener("report", this.report.bind(this));
        handler.addEventListener("onHTMLActionsPanel", this.htmlActionsPanel.bind(this));
        handler.addEventListener("onBrowserPostAction", this.browserPostAction.bind(this));
        handler.addEventListener("beforeWriteContent", this.beforeWriteContent.bind(this));
        handler.addEventListener("beforeCreateFile", this.beforeCreateFile.bind(this));

        /* Namespaces */
        Xml.xmlNamespaces[this.NS_CARDDAV] = "card";

        /* Mapping Interfaces to {DAV:}resourcetype values */
        handler.resourceTypeMapping["{" + this.NS_CARDDAV + "}addressbook"] = jsCardDAV_iAddressBook;
        handler.resourceTypeMapping["{" + this.NS_CARDDAV + "}directory"] = jsCardDAV_iDirectory;

        /* Adding properties that may never be changed */
        handler.protectedProperties.push(
            "{" + this.NS_CARDDAV + "}supported-address-data",
            "{" + this.NS_CARDDAV + "}max-resource-size",
            "{" + this.NS_CARDDAV + "}addressbook-home-set",
            "{" + this.NS_CARDDAV + "}supported-collation-set"
        );

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
     * @param string uri
     * @return array
     */
    getSupportedReportSet: function(uri, callback) {
        this.handler.getNodeForPath(uri, function(err, node) {
            if (err)
                return callback(err);
            
            if (node.hasFeature(jsCardDAV_iAddressBook) || node.hasFeature(jsCardDAV_iCard)) {
                return callback(null, [
                     "{" + this.NS_CARDDAV + "}addressbook-multiget",
                     "{" + this.NS_CARDDAV + "}addressbook-query"
                ]);
            }
            return callback(null, []);
        });
    },

    /**
     * Adds all CardDAV-specific properties
     *
     * @param string path
     * @param DAV\INode node
     * @param array requestedProperties
     * @param array returnedProperties
     * @return void
     */
    beforeGetProperties: function(e, path, node, requestedProperties, returnedProperties) {

        if (node instanceof DAVACL\IPrincipal) {

            // calendar-home-set property
            addHome = "{" . self::NS_CARDDAV . "}addressbook-home-set";
            if (in_array(addHome,requestedProperties)) {
                principalId = node.getName();
                addressbookHomePath = self::ADDRESSBOOK_ROOT . "/" . principalId . "/";
                unset(requestedProperties[array_search(addHome, requestedProperties)]);
                returnedProperties[200][addHome] = new DAV\Property\Href(addressbookHomePath);
            }

            directories = "{" . self::NS_CARDDAV . "}directory-gateway";
            if (this.directories && in_array(directories, requestedProperties)) {
                unset(requestedProperties[array_search(directories, requestedProperties)]);
                returnedProperties[200][directories] = new DAV\Property\HrefList(this.directories);
            }

        }

        if (node instanceof ICard) {

            // The address-data property is not supposed to be a 'real'
            // property, but in large chunks of the spec it does act as such.
            // Therefore we simply expose it as a property.
            addressDataProp = "{" . self::NS_CARDDAV . "}address-data";
            if (in_array(addressDataProp, requestedProperties)) {
                unset(requestedProperties[addressDataProp]);
                val = node.get();
                if (is_resource(val))
                    val = stream_get_contents(val);

                returnedProperties[200][addressDataProp] = val;

            }
        }

        if (node instanceof UserAddressBooks) {

            meCardProp = "{http://calendarserver.org/ns/}me-card";
            if (in_array(meCardProp, requestedProperties)) {

                props = this.server.getProperties(node.getOwner(), array("{http://sabredav.org/ns}vcard-url"));
                if (isset(props["{http://sabredav.org/ns}vcard-url"])) {

                    returnedProperties[200][meCardProp] = new DAV\Property\Href(
                        props["{http://sabredav.org/ns}vcard-url"]
                    );
                    pos = array_search(meCardProp, requestedProperties);
                    unset(requestedProperties[pos]);

                }

            }

        }

    }

    /**
     * This event is triggered when a PROPPATCH method is executed
     *
     * @param array mutations
     * @param array result
     * @param DAV\INode node
     * @return bool
     */
    updateProperties: function(&mutations, &result, DAV\INode node) {

        if (!node instanceof UserAddressBooks) {
            return true;
        }

        meCard = "{http://calendarserver.org/ns/}me-card";

        // The only property we care about
        if (!isset(mutations[meCard]))
            return true;

        value = mutations[meCard];
        unset(mutations[meCard]);

        if (value instanceof DAV\Property\IHref) {
            value = value.getHref();
            value = this.server.calculateUri(value);
        } elseif (!is_null(value)) {
            result[400][meCard] = null;
            return false;
        }

        innerResult = this.server.updateProperties(
            node.getOwner(),
            array(
                "{http://sabredav.org/ns}vcard-url": value,
            )
        );

        closureResult = false;
        foreach(innerResult as status: props) {
            if (is_array(props) && array_key_exists("{http://sabredav.org/ns}vcard-url", props)) {
                result[status][meCard] = null;
                closureResult = (status>=200 && status<300);
            }

        }

        return result;

    }

    /**
     * This functions handles REPORT requests specific to CardDAV
     *
     * @param string reportName
     * @param \DOMNode dom
     * @return bool
     */
    report: function(reportName,dom) {

        switch(reportName) {
            case "{".self::NS_CARDDAV."}addressbook-multiget" :
                this.addressbookMultiGetReport(dom);
                return false;
            case "{".self::NS_CARDDAV."}addressbook-query" :
                this.addressBookQueryReport(dom);
                return false;
            default :
                return;

        }


    }

    /**
     * This function handles the addressbook-multiget REPORT.
     *
     * This report is used by the client to fetch the content of a series
     * of urls. Effectively avoiding a lot of redundant requests.
     *
     * @param \DOMNode dom
     * @return void
     */
    addressbookMultiGetReport: function(dom) {

        properties = array_keys(DAV\XMLUtil::parseProperties(dom.firstChild));

        hrefElems = dom.getElementsByTagNameNS("urn:DAV","href");
        propertyList = array();

        foreach(hrefElems as elem) {

            uri = this.server.calculateUri(elem.nodeValue);
            list(propertyList[]) = this.server.getPropertiesForPath(uri,properties);

        }

        prefer = this.server.getHTTPPRefer();

        this.server.httpResponse.sendStatus(207);
        this.server.httpResponse.setHeader("Content-Type","application/xml; charset=utf-8");
        this.server.httpResponse.setHeader("Vary","Brief,Prefer");
        this.server.httpResponse.sendBody(this.server.generateMultiStatus(propertyList, prefer["return-minimal"]));

    }

    /**
     * This method is triggered before a file gets updated with new content.
     *
     * This plugin uses this method to ensure that Card nodes receive valid
     * vcard data.
     *
     * @param string path
     * @param DAV\IFile node
     * @param resource data
     * @return void
     */
    beforeWriteContent: function(path, DAV\IFile node, &data) {

        if (!node instanceof ICard)
            return;

        this.validateVCard(data);

    }

    /**
     * This method is triggered before a new file is created.
     *
     * This plugin uses this method to ensure that Card nodes receive valid
     * vcard data.
     *
     * @param string path
     * @param resource data
     * @param DAV\ICollection parentNode
     * @return void
     */
    beforeCreateFile: function(path, &data, DAV\ICollection parentNode) {

        if (!parentNode instanceof IAddressBook)
            return;

        this.validateVCard(data);

    }

    /**
     * Checks if the submitted iCalendar data is in fact, valid.
     *
     * An exception is thrown if it's not.
     *
     * @param resource|string data
     * @return void
     */
    protected function validateVCard(&data) {

        // If it's a stream, we convert it to a string first.
        if (is_resource(data)) {
            data = stream_get_contents(data);
        }

        // Converting the data to unicode, if needed.
        data = DAV\StringUtil::ensureUTF8(data);

        try {

            vobj = VObject\Reader::read(data);

        } catch (VObject\ParseException e) {

            throw new DAV\Exception\UnsupportedMediaType("This resource only supports valid vcard data. Parse error: " . e.getMessage());

        }

        if (vobj.name !== "VCARD") {
            throw new DAV\Exception\UnsupportedMediaType("This collection can only support vcard objects.");
        }

        if (!isset(vobj.UID)) {
            throw new DAV\Exception\BadRequest("Every vcard must have a UID.");
        }

    }


    /**
     * This function handles the addressbook-query REPORT
     *
     * This report is used by the client to filter an addressbook based on a
     * complex query.
     *
     * @param \DOMNode dom
     * @return void
     */
    protected function addressbookQueryReport(dom) {

        query = new AddressBookQueryParser(dom);
        query.parse();

        depth = this.server.getHTTPDepth(0);

        if (depth==0) {
            candidateNodes = array(
                this.server.tree.getNodeForPath(this.server.getRequestUri())
            );
        } else {
            candidateNodes = this.server.tree.getChildren(this.server.getRequestUri());
        }

        validNodes = array();
        foreach(candidateNodes as node) {

            if (!node instanceof ICard)
                continue;

            blob = node.get();
            if (is_resource(blob)) {
                blob = stream_get_contents(blob);
            }

            if (!this.validateFilters(blob, query.filters, query.test)) {
                continue;
            }

            validNodes[] = node;

            if (query.limit && query.limit <= count(validNodes)) {
                // We hit the maximum number of items, we can stop now.
                break;
            }

        }

        result = array();
        foreach(validNodes as validNode) {

            if (depth==0) {
                href = this.server.getRequestUri();
            } else {
                href = this.server.getRequestUri() . "/" . validNode.getName();
            }

            list(result[]) = this.server.getPropertiesForPath(href, query.requestedProperties, 0);

        }

        prefer = this.server.getHTTPPRefer();

        this.server.httpResponse.sendStatus(207);
        this.server.httpResponse.setHeader("Content-Type","application/xml; charset=utf-8");
        this.server.httpResponse.setHeader("Vary","Brief,Prefer");
        this.server.httpResponse.sendBody(this.server.generateMultiStatus(result, prefer["return-minimal"]));

    }

    /**
     * Validates if a vcard makes it throught a list of filters.
     *
     * @param string vcardData
     * @param array filters
     * @param string test anyof or allof (which means OR or AND)
     * @return bool
     */
    validateFilters: function(vcardData, array filters, test) {

        vcard = VObject\Reader::read(vcardData);

        if (!filters) return true;

        foreach(filters as filter) {

            isDefined = isset(vcard.{filter["name"]});
            if (filter["is-not-defined"]) {
                if (isDefined) {
                    success = false;
                } else {
                    success = true;
                }
            } elseif ((!filter["param-filters"] && !filter["text-matches"]) || !isDefined) {

                // We only need to check for existence
                success = isDefined;

            } else {

                vProperties = vcard.select(filter["name"]);

                results = array();
                if (filter["param-filters"]) {
                    results[] = this.validateParamFilters(vProperties, filter["param-filters"], filter["test"]);
                }
                if (filter["text-matches"]) {
                    texts = array();
                    foreach(vProperties as vProperty)
                        texts[] = vProperty.value;

                    results[] = this.validateTextMatches(texts, filter["text-matches"], filter["test"]);
                }

                if (count(results)===1) {
                    success = results[0];
                } else {
                    if (filter["test"] === "anyof") {
                        success = results[0] || results[1];
                    } else {
                        success = results[0] && results[1];
                    }
                }

            } // else

            // There are two conditions where we can already determine whether
            // or not this filter succeeds.
            if (test==="anyof" && success) {
                return true;
            }
            if (test==="allof" && !success) {
                return false;
            }

        } // foreach

        // If we got all the way here, it means we haven't been able to
        // determine early if the test failed or not.
        //
        // This implies for 'anyof' that the test failed, and for 'allof' that
        // we succeeded. Sounds weird, but makes sense.
        return test==="allof";

    }

    /**
     * Validates if a param-filter can be applied to a specific property.
     *
     * @todo currently we're only validating the first parameter of the passed
     *       property. Any subsequence parameters with the same name are
     *       ignored.
     * @param array vProperties
     * @param array filters
     * @param string test
     * @return bool
     */
    protected function validateParamFilters(array vProperties, array filters, test) {

        foreach(filters as filter) {

            isDefined = false;
            foreach(vProperties as vProperty) {
                isDefined = isset(vProperty[filter["name"]]);
                if (isDefined) break;
            }

            if (filter["is-not-defined"]) {
                if (isDefined) {
                    success = false;
                } else {
                    success = true;
                }

            // If there's no text-match, we can just check for existence
            } elseif (!filter["text-match"] || !isDefined) {

                success = isDefined;

            } else {

                success = false;
                foreach(vProperties as vProperty) {
                    // If we got all the way here, we'll need to validate the
                    // text-match filter.
                    success = DAV\StringUtil::textMatch(vProperty[filter["name"]].value, filter["text-match"]["value"], filter["text-match"]["collation"], filter["text-match"]["match-type"]);
                    if (success) break;
                }
                if (filter["text-match"]["negate-condition"]) {
                    success = !success;
                }

            } // else

            // There are two conditions where we can already determine whether
            // or not this filter succeeds.
            if (test==="anyof" && success) {
                return true;
            }
            if (test==="allof" && !success) {
                return false;
            }

        }

        // If we got all the way here, it means we haven't been able to
        // determine early if the test failed or not.
        //
        // This implies for 'anyof' that the test failed, and for 'allof' that
        // we succeeded. Sounds weird, but makes sense.
        return test==="allof";

    }

    /**
     * Validates if a text-filter can be applied to a specific property.
     *
     * @param array texts
     * @param array filters
     * @param string test
     * @return bool
     */
    protected function validateTextMatches(array texts, array filters, test) {

        foreach(filters as filter) {

            success = false;
            foreach(texts as haystack) {
                success = DAV\StringUtil::textMatch(haystack, filter["value"], filter["collation"], filter["match-type"]);

                // Breaking on the first match
                if (success) break;
            }
            if (filter["negate-condition"]) {
                success = !success;
            }

            if (success && test==="anyof")
                return true;

            if (!success && test=="allof")
                return false;


        }

        // If we got all the way here, it means we haven't been able to
        // determine early if the test failed or not.
        //
        // This implies for 'anyof' that the test failed, and for 'allof' that
        // we succeeded. Sounds weird, but makes sense.
        return test==="allof";

    }

    /**
     * This event is triggered after webdav-properties have been retrieved.
     *
     * @return bool
     */
    afterGetProperties: function(uri, &properties) {

        // If the request was made using the SOGO connector, we must rewrite
        // the content-type property. By default SabreDAV will send back
        // text/x-vcard; charset=utf-8, but for SOGO we must strip that last
        // part.
        if (!isset(properties[200]["{DAV:}getcontenttype"]))
            return;

        if (strpos(this.server.httpRequest.getHeader("User-Agent"),"Thunderbird")===false) {
            return;
        }

        if (strpos(properties[200]["{DAV:}getcontenttype"],"text/x-vcard")===0) {
            properties[200]["{DAV:}getcontenttype"] = "text/x-vcard";
        }

    }

    /**
     * This method is used to generate HTML output for the
     * Sabre\DAV\Browser\Plugin. This allows us to generate an interface users
     * can use to create new calendars.
     *
     * @param DAV\INode node
     * @param string output
     * @return bool
     */
    htmlActionsPanel: function(DAV\INode node, &output) {

        if (!node instanceof UserAddressBooks)
            return;

        output.= '<tr><td colspan="2"><form method="post" action="">
            <h3>Create new address book</h3>
            <input type="hidden" name="sabreAction" value="mkaddressbook" />
            <label>Name (uri):</label> <input type="text" name="name" /><br />
            <label>Display name:</label> <input type="text" name="{DAV:}displayname" /><br />
            <input type="submit" value="create" />
            </form>
            </td></tr>';

        return false;

    }

    /**
     * This method allows us to intercept the 'mkcalendar' sabreAction. This
     * action enables the user to create new calendars from the browser plugin.
     *
     * @param string uri
     * @param string action
     * @param array postVars
     * @return bool
     */
    browserPostAction: function(uri, action, array postVars) {

        if (action!=="mkaddressbook")
            return;

        resourceType = array("{DAV:}collection","{urn:ietf:params:xml:ns:carddav}addressbook");
        properties = array();
        if (isset(postVars["{DAV:}displayname"])) {
            properties["{DAV:}displayname"] = postVars["{DAV:}displayname"];
        }
        this.server.createCollection(uri . "/" . postVars["name"],resourceType,properties);
        return false;

    }
});
