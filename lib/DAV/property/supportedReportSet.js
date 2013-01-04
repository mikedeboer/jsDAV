/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV = require("./../../jsdav");
var jsDAV_Property = require("./../property");

var Exc = require("./../../shared/exceptions");

/**
 * Creates the property
 * Any reports passed in the constructor
 * should be valid report-types in clark-notation.
 * Either a string or an array of strings must be passed.
 *
 * @param {mixed} report
 * @constructor
 */
var jsDAV_Property_SupportedReportSet = module.exports = jsDAV_Property.extend({
    initialize: function(report) {
        this.reports = [];
        if (report)
            this.addReport(report);
    },

    /**
     * Adds a report to this property
     *
     * The report must be a string in clark-notation.
     * Multiple reports can be specified as an array.
     *
     * @param mixed report
     * @return void
     */
    addReport: function(report) {
        if (report.constructor != Array)
            report = [report];

        for (var r, i = 0, l = report.length; i < l; ++i) {
            r = report[i];
            if (typeof r != "string") continue;
            if (!/^\{([^\}]*)\}(.*)/.test(r))
                throw new Exc.jsDAV_Exception("Reportname must be in clark-notation");
            this.reports.push(r);
        }
    },

    /**
     * Returns the list of supported reports
     *
     * @return array
     */
    getValue: function() {
        return this.reports;
    },

    /**
     * Serializes the node
     *
     * @param {DAV_Server} server
     * @param {String}     prop
     * @return {void}
     */
    serialize: function(handler, dom) {
        var repReportName, repMatches, repNS, repElement, repPrefix;
        var repCnt = 0;
        var repLen = this.reports.length;
        for (; repCnt < repLen; ++repCnt) {
            repReportName = this.reports[repCnt];

            dom += "<d:supported-report>"
                +     "<d:report>";

            repMatches = repReportName.match(/^\{([^\}]*)\}(.*)/g);
            repNS      = repMatches[1];
            repElement = repMatches[2];

            repPrefix  = handler.xmlNamespaces[repNS] ? handler.xmlNamespaces[repNS] : null;

            if (repPrefix)
                dom += "<" + repPrefix + ":" + repElement + "/>";
            else
                dom += "<x:" + repElement + " xmlns:x=\"" + repNS + "\"/>";
        }
        return dom;
    }
});
