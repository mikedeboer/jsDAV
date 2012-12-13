/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV = require("./../../jsdav");
var jsDAV_Property = require("./../property").jsDAV_Property;

var jsDAV_Property_iHref = module.exports = function() {};

(function() {
    this.REGBASE = this.REGBASE | jsDAV.__PROP_IHREF__;

    /**
     * getHref
     *
     * @return {string}
     */
    this.getHref = function() {};
}).call(jsDAV_Property_iHref.prototype = new jsDAV_Property());
