/*
 * @package jsDAV
 * @subpackage VObject
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsVObject_Node = require("./node");
var jsVObject_Parameter = require("./parameter");

var Util = require("../shared/util");

/**
 * VObject Property
 *
 * A property in VObject is usually in the form PARAMNAME:paramValue.
 * An example is : SUMMARY:Weekly meeting
 *
 * Properties can also have parameters:
 * SUMMARY;LANG=en:Weekly meeting.
 */
var jsVObject_Property = module.exports = jsVObject_Node.extend({
    /**
     * Propertyname
     *
     * @var string
     */
    name: null,

    /**
     * Group name
     *
     * This may be something like 'HOME' for vcards.
     *
     * @var string
     */
    group: null,

    /**
     * Property value
     *
     * @var string
     */
    value: null,

    /**
     * If properties are added to this map, they will be automatically mapped
     * to their respective classes, if parsed by the reader or constructed with
     * the 'create' method.
     *
     * @var array
     */
    classMap: {
        "COMPLETED"    : "./property/dateTime",
        "CREATED"      : "./property/dateTime",
        "DTEND"        : "./property/dateTime",
        "DTSTAMP"      : "./property/dateTime",
        "DTSTART"      : "./property/dateTime",
        "DUE"          : "./property/dateTime",
        "EXDATE"       : "./property/multiDateTime",
        "LAST-MODIFIED": "./property/dateTime",
        "RECURRENCE-ID": "./property/dateTime",
        "TRIGGER"      : "./property/dateTime",
        "N"            : "./property/compound",
        "ORG"          : "./property/compound",
        "ADR"          : "./property/compound",
        "CATEGORIES"   : "./property/compound"
    },

    /**
     * Creates the new property by name, but in addition will also see if
     * there's a class mapped to the property name.
     *
     * Parameters can be specified with the optional third argument. Parameters
     * must be a key->value map of the parameter name, and value. If the value
     * is specified as an array, it is assumed that multiple parameters with
     * the same name should be added.
     *
     * @param {String} name
     * @param {String} value
     * @param {Object} parameters
     * @return Property
     */
    create: function(name, value, parameters) {
        value = value || null;
        parameters = parameters || {};
        
        name = name.toUpperCase();
        var shortName = name;
        if (shortName.indexOf(".") > -1) {
            var parts = shortName.split(".");
            shortName = parts[1];
        }

        if (this.classMap[shortName])
            return require(this.classMap[shortName]).new(name, value, parameters);
        else
            return jsVObject_Property.new(name, value, parameters);
    },

    /**
     * Creates a new property object
     *
     * Parameters can be specified with the optional third argument. Parameters
     * must be a key->value map of the parameter name, and value. If the value
     * is specified as an array, it is assumed that multiple parameters with
     * the same name should be added.
     *
     * @param {String} name
     * @param {String} value
     * @param {Object} parameters
     */
    initialize: function(name, value, parameters) {
        value = value || null;
        parameters = parameters || {};
        if (!Util.isScalar(value) && value !== null)
            throw new Error("The value argument must be scalar or null");

        this.children = [];
        name = name.toUpperCase();
        var group = null;
        if (name.indexOf(".") > -1) {
            var parts = name.split(".");
            group = parts[0];
            name = parts[1];
        }
        this.name = name;
        this.group = group;
        this.setValue(value);

        var paramValues, i, l;
        for (var paramName in parameters) {
            paramValues = parameters[paramName];
            if (!Array.isArray(paramValues))
                paramValues = [paramValues];

            for (i = 0, l = paramValues.length; i < l; ++i)
                this.add(paramName, paramValues[i]);
        }
    },

    setParts: function(parts) {
        this.setValue(parts);
    },

    getParts: function() {
        if(this.value === null) {
            return [];
        } else if(this.value instanceof Array) {
            return this.value;
        } else {
            return [ this.value ];
        }
    },

    getValue: function() {
        return this.value;
    },

    /**
     * Updates the internal value
     *
     * @param {String} value
     * @return void
     */
    setValue: function(value) {
        this.value = value;
    },

    /**
     * Turns the object back into a serialized blob.
     *
     * @return string
     */
    serialize: function() {
        var str = this.name;
        if (this.group)
            str = this.group + "." + this.name;

        this.children.forEach(function(param) {
            str += ";" + param.serialize();
        });

        str += ":" + this.value
            .replace("\\", "\\\\")
            .replace("\n", "\\n");

        var out = "";
        while (str.length > 0) {
            if (str.length > 75) {
                out += str.substr(0,75) + "\r\n";
                str = " " + str.substr(75, str.length);
            }
            else {
                out += str + "\r\n";
                str = "";
                break;
            }
        }

        return out;
    },

    /**
     * Adds a new componenten or element
     *
     * You can call this method with the following syntaxes:
     *
     * add(Parameter element)
     * add(string name, value)
     *
     * The first version adds an Parameter
     * The second adds a property as a string.
     *
     * @param {mixed} item
     * @param {mixed} itemValue
     * @return void
     */
    add: function(item, itemValue) {
        itemValue = itemValue || null;
        
        if (item.hasFeature(jsVObject_Parameter)) {
            if (itemValue !== null)
                throw new Error("The second argument must not be specified, when passing a VObject");
            item.parent = this;
            this.children.push(item);
        }
        else if(typeof item == "string") {
            var parameter = new jsVObject_Parameter(item, itemValue);
            parameter.parent = this;
            this.children.push(parameter);
        }
        else
            throw new Error("The first argument must either be a Node a string");
    },

    /**
     * Called when this object is being cast to a string
     *
     * @return string
     */
    toString: function() {
        return this.value.toString();
    },

    /**
     * Validates the node for correctness.
     *
     * The following options are supported:
     *   - Node::REPAIR - If something is broken, and automatic repair may
     *                    be attempted.
     *
     * An array is returned with warnings.
     *
     * Every item in the array has the following properties:
     *    * level - (number between 1 and 3 with severity information)
     *    * message - (human readable message)
     *    * node - (reference to the offending node)
     *
     * @param {Number} options
     * @return array
     */
    validate: function(options) {
        options = options || 0;
        var warnings = [];

        // Checking if the propertyname does not contain any invalid bytes.
        if (!/^([A-Z0-9\-]+)/.test(this.name)) {
            warnings.push({
                "level": 1,
                "message": "The propertyname: " + this.name + " contains invalid characters. Only A-Z, 0-9 and - are allowed",
                "node": this
            });
            if (options & this.REPAIR) {
                // Uppercasing and converting underscores to dashes.
                this.name = this.name.replace("_", "-").toUpperCase();
                // Removing every other invalid character
                this.name = this.name.replace(/([^A-Z0-9\-])/g, "");
            }
        }

        // Validating inner parameters
        this.children.forEach(function(param) {
            warnings = warnings.concat(param.validate(options));
        });

        return warnings;
    }
});
