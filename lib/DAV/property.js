var jsDAV = require("./../jsdav");

/**
 * Abstract property class
 *
 * Extend this class to create custom complex properties
 */
function jsDAV_Property() {};

exports.jsDAV_Property = jsDAV_Property;

(function() {
    this.REGBASE = this.REGBASE | jsDAV.__PROPERTY__;

    this.serialize = function(server, prop) {};

    this.unserialize(prop) = function(){
        return null;
    };
}).call(jsDAV_Property.prototype = new jsDAV.jsDAV_Base);
