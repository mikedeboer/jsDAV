/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV          = require("./../../jsdav"),
    jsDAV_Property = require("./../property").jsDAV_Property;

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
