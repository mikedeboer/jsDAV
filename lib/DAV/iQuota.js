/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
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
function jsDAV_iQuota() {}

exports.jsDAV_iQuota = jsDAV_iQuota;

(function() {
    this.REGBASE = this.REGBASE | jsDAV.__IQUOTA__;

    /**
     * Returns the quota information
     *
     * This method MUST return an array with 2 values, the first being the total used space,
     * the second the available space (in bytes)
     */
    this.getQuotaInfo = function(callback) {};
}).call(jsDAV_iQuota.prototype = new jsDAV_iCollection());
