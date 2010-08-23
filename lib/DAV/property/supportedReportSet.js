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
            if (!r.test(/^{([^}]*)}(.*)/))
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
    this.serialize = function(server, prop) {
        var reportName, matches, namespace, element, prefix,
            i = 0,
            l = this.reports.length;
        if (l)
            prop += ">";
        for (; i < l; ++i) {
            reportName = this.reports[i];
            
            prop += "<d:supported-report>"
                 +     "<d:report>";

            matches   = reportName.match(/^{([^}]*)}(.*)/g);
            namespace = matches[1];
            element   = matches[2];

            prefix = server.xmlNamespaces[namespace] ? server.xmlNamespaces[namespace] : null;

            if (prefix)
                prop += "<" + prefix + ":" + element + "/>";
            else
                prop += "<x:" + element + " xmlns:x=\"" + namespace + "\"/>";
        }
    };
}).call(jsDAV_Property_SupportedReportSet.prototype = new jsDAV.jsDAV_Property());
