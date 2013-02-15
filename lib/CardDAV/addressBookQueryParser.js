/*
 * @package jsDAV
 * @subpackage CardDAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var Base = require("./../shared/base");
var Exc = require("./../shared/exceptions");
var Xml = require("./../shared/xml");

var Xpath = require("xpath");

/**
 * Parses the addressbook-query report request body.
 *
 * Whoever designed this format, and the CalDAV equivalent even more so,
 * has no feel for design.
 */
var jsCardDAV_AddressBookQueryParser = module.exports = Base.extend({
    TEST_ANYOF: "anyof",
    TEST_ALLOF: "allof",
    
    MATCH_TYPES: ["contains", "equals", "starts-with", "ends-with"],

    /**
     * List of requested properties the client wanted
     *
     * @var array
     */
    requestedProperties: [],

    /**
     * The number of results the client wants
     *
     * null means it wasn't specified, which in most cases means 'all results'.
     *
     * @var int|null
     */
    limit: null,

    /**
     * List of property filters.
     *
     * @var array
     */
    filters: [],

    /**
     * Either TEST_ANYOF or TEST_ALLOF
     *
     * @var string
     */
    test: null,

    /**
     * DOM Document
     *
     * @var DOMDocument
     */
    dom: null,

    /**
     * DOM XPath object
     *
     * @var DOMXPath
     */
    xpath: null,

    /**
     * Creates the parser
     *
     * @param DOMDocument dom
     */
    initialize: function(dom) {
        this.dom = dom;
    },

    /**
     * Parses the request.
     *
     * @return void
     * @throws Exc.BadRequest
     */
    parse: function() {
        var filterNode = null;
        var limit = parseInt(Xpath.select("/card:addressbook-query/card:limit/card:nresults", this.dom), 10);
        if (isNaN(limit))
            limit = null;

        var test;
        var filter = Xpath.select("/card:addressbook-query/card:filter", this.dom);

        // According to the CardDAV spec there needs to be exactly 1 filter
        // element. However, KDE 4.8.2 contains a bug that will encode 0 filter
        // elements, so this is a workaround for that.
        //
        // See: https://bugs.kde.org/show_bug.cgi?id=300047
        if (filter.length === 0) {
            test = null;
            filter = null;
        }
        else if (filter.length === 1) {
            filter = filter.item(0);
            test = Xpath.select("string(@test)", filter);
        }
        else {
            throw new Exc.BadRequest("Only one filter element is allowed");
        }

        if (!test)
            test = this.TEST_ANYOF;
        if (test !== this.TEST_ANYOF && test !== this.TEST_ALLOF)
            throw new Exc.BadRequest("The test attribute must either hold 'anyof' or 'allof'");

        var propFilters = [];

        var propFilterNodes = Xpath.select("card:prop-filter", filter);
        for (var i = 0, l = propFilterNodes.length; i < l; ++i)
            propFilters.push(this.parsePropFilterNode(propFilterNodes[i]));

        this.filters = propFilters;
        this.limit = limit;
        this.requestedProperties = Object.keys(Xml.parseProperties(this.dom.firstChild));
        this.test = test;
    },

    /**
     * Parses the prop-filter xml element
     *
     * @param DOMElement propFilterNode
     * @return array
     * @throws Exc.BadRequest
     */
    parsePropFilterNode: function(propFilterNode) {
        var propFilter = {
            name: propFilterNode.getAttribute("name"),
            test: propFilterNode.getAttribute("test")
        }
        if (!propFilter.test)
            propFilter.test = this.TEST_ANYOF;

        propFilter["is-not-defined"] = Xpath.select("card:is-not-defined", propFilterNode).length > 0;
        var paramFilterNodes = Xpath.select("card:param-filter", propFilterNode);

        propFilter["param-filters"] = [];

        for (var i = 0, l = paramFilterNodes.length; i < l; ++i)
            propFilter["param-filters"].push(this.parseParamFilterNode(paramFilterNodes[i]));
            
        propFilter["text-matches"] = [];
        var textMatchNodes = Xpath.select("card:text-match", propFilterNode);
        for (i = 0, l = textMatchNodes.length; i < l; ++i)
            propFilter["text-matches"].push(this.parseTextMatchNode(textMatchNodes[i]));

        return propFilter;
    },

    /**
     * Parses the param-filter element
     *
     * @param DOMElement paramFilterNode
     * @return array
     * @throws Exc.BadRequest
     */
    parseParamFilterNode: function(paramFilterNode) {
        var paramFilter = {
            name: paramFilterNode.getAttribute("name"),
            "is-not-defined": Xpath.select("card:is-not-defined", paramFilterNode).length > 0,
            "text-match": null
        };

        var textMatch = Xpath.select("card:text-match", paramFilterNode);
        if (textMatch.length > 0)
            paramFilter["text-match"] = this.parseTextMatchNode(textMatch[0]);

        return paramFilter;
    },

    /**
     * Text match
     *
     * @param DOMElement textMatchNode
     * @return array
     * @throws Exc.BadRequest
     */
    parseTextMatchNode: function(textMatchNode) {
        var matchType = textMatchNode.getAttribute("match-type");
        if (!matchType)
            matchType = "contains";

        if (this.MATH_TYPES.indexOf(matchType) === -1)
            throw new Exc.BadRequest("Unknown match-type: " + matchType);

        var negateCondition = textMatchNode.getAttribute("negate-condition");
        negateCondition = negateCondition == "yes";
        var collation = textMatchNode.getAttribute("collation");
        if (!collation)
            collation = "i;unicode-casemap";

        return {
            "negate-condition": negateCondition,
            collation: collation,
            "match-type": matchType,
            value: textMatchNode.nodeValue
        }
    }
});
