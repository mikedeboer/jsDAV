/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV          = require("./../../jsdav"),
    jsDAV_Property = require("./../property").jsDAV_Property,

    Exc            = require("./../exceptions");

/**
 * Creates the property
 * Any reports passed in the constructor
 * should be valid report-types in clark-notation.
 * Either a string or an array of strings must be passed.
 * 
 * @param {mixed} report
 * @constructor
 */
function jsDAV_Property_SupportedReportSet(report) {
    this.reports = [];
    if (report) 
        this.addReport(report);
}

exports.jsDAV_Property_SupportedReportSet = jsDAV_Property_SupportedReportSet;

(function() {
    this.REGBASE = this.REGBASE | jsDAV.__PROP_SUPPORTEDREPORTSET__;
    
    /**
     * Adds a report to this property
     *
     * The report must be a string in clark-notation.
     * Multiple reports can be specified as an array.
     *
     * @param mixed report
     * @return void
     */
    this.addReport = function(report) {
        if (report.constructor != Array)
            report = [report];

        for (var r, i = 0, l = report.length; i < l; ++i) {
            r = report[i];
            if (typeof r != "string") continue;
            if (!r.test(/^\{([^\}]*)\}(.*)/))
                throw new Exc.jsDAV_Exception("Reportname must be in clark-notation");
            this.reports.push(r);
        }
    };

    /**
     * Returns the list of supported reports
     *
     * @return array
     */
    this.getValue = function() {
        return this.reports;
    };

    /**
     * Serializes the node
     *
     * @param {DAV_Server} server
     * @param {String}     prop
     * @return {void}
     */
    this.serialize = function(handler, dom) {
        var repReportName, repMatches, repNS, repElement, repPrefix,
            repCnt = 0,
            repLen = this.reports.length;
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
    };
}).call(jsDAV_Property_SupportedReportSet.prototype = new jsDAV_Property());
