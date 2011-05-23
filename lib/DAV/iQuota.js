/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV             = require("./../jsdav"),
    jsDAV_iCollection = require("./iCollection").jsDAV_iCollection;

/**
 * iQuota interface
 *
 * Implement this interface to add the ability to return quota information. The ObjectTree
 * will check for quota information on any given node. If the information is not available it will
 * attempt to fetch the information from the root node.
 */
function jsDAV_iQuota() {
    this.REGBASE = this.REGBASE | jsDAV.__IQUOTA__;

    /**
     * Returns the quota information
     *
     * This method MUST return an array with 2 values, the first being the total used space,
     * the second the available space (in bytes)
     */
    this.getQuotaInfo = function(cbquotainf) {};
}

exports.jsDAV_iQuota = jsDAV_iQuota;
