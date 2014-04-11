/*
 * @package jsDAV
 * @subpackage VObject
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsVObject_Property = require("./../property");

/**
 * Compound property.
 *
 * This class adds (de)serialization of compound properties to/from arrays.
 *
 * Currently the following properties from RFC 6350 are mapped to use this
 * class:
 *
 *  N:          Section 6.2.2
 *  ADR:        Section 6.3.1
 *  ORG:        Section 6.6.4
 *  CATEGORIES: Section 6.7.1
 *
 * In order to use this correctly, you must call setParts and getParts to
 * retrieve and modify dates respectively.
 */
var jsVObject_Property_Compound = module.exports = jsVObject_Property.extend({
    /**
     * If property names are added to this map, they will be (de)serialised as arrays
     * using the getParts() and setParts() methods.
     * The keys are the property names, values are delimiter chars.
     *
     * @var array
     */
    delimiterMap: {
        "N": ";",
        "ADR": ";",
        "ORG": ";",
        "CATEGORIES": ","
    },

    /**
     * The currently used delimiter.
     *
     * @var string
     */
    delimiter: null,

    /**
    * Get a compound value as an array.
    *
    * @return {Array}
    */
    getParts: function() {
        if (!this.value)
            return [];

        var delimiter = this.getDelimiter();

        // split by any delimiter which is NOT prefixed by a slash.
        // Note that this is not a a perfect solution. If a value is prefixed
        // by two slashes, it should actually be split anyway.
        //
        // Hopefully we can fix this better in a future version, where we can
        // break compatibility a bit.
        var compoundValues = this.value.split(new RegExp("(?<!\\\\)" + delimiter));

        // remove slashes from any semicolon and comma left escaped in the single values
        return compoundValues.map(function(val) {
            return val.replace("\\,", ",")
                      .replace("\\;", ";");
        });
    },

    /**
     * Returns the delimiter for this property.
     *
     * @return {String}
     */
    getDelimiter: function() {
        if (!this.delimiter) {
            if (this.delimiterMap[this.name]) {
                this.delimiter = this.delimiterMap[this.name];
            }
            else {
                // To be a bit future proof, we are going to default the
                // delimiter to ;
                this.delimiter = ";";
            }
        }
        return this.delimiter;
    },

    /**
     * Set a compound value as an array.
     *
     *
     * @param {Array} values
     */
    setParts: function(values) {
        // add slashes to all semicolons and commas in the single values
        values = values.map(function(val) {
            return val.replace(",", "\\,")
                      .replace(";", "\\;");
        });

        this.setValue(values.join(this.getDelimiter()))
    }
});
