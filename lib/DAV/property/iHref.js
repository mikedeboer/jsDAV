/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV          = require("./../../jsdav");

function jsDAV_Property_iHref() {}

exports.jsDAV_Property_iHref = jsDAV_Property_iHref;

(function() {
    this.REGBASE = this.REGBASE | jsDAV.__PROP_IHREF__;

    /**
     * getHref 
     * 
     * @return {string}
     */
    this.getHref = function() {};
}).call(jsDAV_Property_iHref.prototype = new jsDAV.jsDAV_Property());
