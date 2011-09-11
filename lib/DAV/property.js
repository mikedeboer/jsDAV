/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV = require("./../jsdav");

/**
 * Abstract property class
 *
 * Extend this class to create custom complex properties
 */
function jsDAV_Property() {}

exports.jsDAV_Property = jsDAV_Property;

(function() {
    this.REGBASE = this.REGBASE | jsDAV.__PROPERTY__;

    this.serialize = function(handler, prop) {};

    this.unserialize = function(){
        return null;
    };
}).call(jsDAV_Property.prototype = new jsDAV.jsDAV_Base());
