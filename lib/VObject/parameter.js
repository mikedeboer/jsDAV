/*
 * @package jsDAV
 * @subpackage VObject
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsVObject_Node = require("./node");

var Util = require("../shared/util");

/**
 * VObject Parameter
 *
 * This class represents a parameter. A parameter is always tied to a property.
 * In the case of:
 *   DTSTART;VALUE=DATE:20101108
 * VALUE=DATE would be the parameter name and value.
 */
var jsVObject_Parameter = module.exports = jsVObject_Node.extend({
    /**
     * Parameter name
     *
     * @var string
     */
    name: null,

    /**
     * Parameter value
     *
     * @var string
     */
    value: null,

    /**
     * Sets up the object
     *
     * @param {String} name
     * @param {String} value
     */
    initialize: function(name, value) {
        value = value || null;
        if (!Util.isScalar(value) && value !== null)
            throw new Error("The value argument must be a scalar value or null");

        this.name = name.toUpperCase();
        this.value = value;
    },

    /**
     * Turns the object back into a serialized blob.
     *
     * @return string
     */
    serialize: function() {
        if (this.value === null)
            return this.name;

        var value = this.value
            .replace("\\", "\\\\")
            .replace("\n", "\\n")
            .replace(";", "\\;")
            .replace(",", "\\,");

        return this.name + "=" + value;
    },

    getValue: function() {
        return this.value;
    },

    /**
     * Called when this object is being cast to a string
     *
     * @return string
     */
    toString: function() {
        return this.value;
    }
});
