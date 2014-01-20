/*
 * @package jsDAV
 * @subpackage VObject
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsVObject_Node = require("./node");
var jsVObject_Property = require("./property");

var Exc = require("./../shared/exceptions");
var Util = require("./../shared/util");

/**
 * VObject Component
 *
 * This class represents a VCALENDAR/VCARD component. A component is for example
 * VEVENT, VTODO and also VCALENDAR. It starts with BEGIN:COMPONENTNAME and
 * ends with END:COMPONENTNAME
 */
var jsVObject_Component = module.exports = jsVObject_Node.extend({
    /**
     * Name, for example VEVENT
     *
     * @var string
     */
    name: null,

    /**
     * If components are added to this map, they will be automatically mapped
     * to their respective classes, if parsed by the reader or constructed with
     * the 'create' method.
     *
     * @var array
     */
    classMap: {
        "VALARM"        : "./component/VAlarm",
        "VCALENDAR"     : "./component/VCalendar",
        "VCARD"         : "./component/VCard",
        "VEVENT"        : "./component/VEvent",
        "VJOURNAL"      : "./component/VJournal",
        "VTODO"         : "./component/VTodo",
        "VFREEBUSY"     : "./component/VFreeBusy"
    },

    /**
     * Creates the new component by name, but in addition will also see if
     * there's a class mapped to the property name.
     *
     * @param {String} name
     * @param {String} value
     * @return Component
     */
    create: function(name, value) {
        name = name.toUpperCase();
        if (this.classMap[name])
            return require(this.classMap[name]).new(name, value);
        else
            return jsVObject_Component.new(name, value);
    },

    /**
     * Creates a new component.
     *
     * By default this object will iterate over its own children, but this can
     * be overridden with the iterator argument
     *
     * @param {String} name
     * @param ElementList iterator
     */
    initialize: function(name, iterator) {
        this.name = name.toUpperCase();
        this.children = [];
        if (iterator)
            this.iterator = iterator;
    },

    /**
     * Turns the object back into a serialized blob.
     *
     * @return string
     */
    serialize: function() {
        var aStr = ["BEGIN:" + this.name + "\r\n"];

        /**
         * Gives a component a 'score' for sorting purposes.
         *
         * This is solely used by the childrenSort method.
         *
         * A higher score means the item will be lower in the list.
         * To avoid score collisions, each "score category" has a reasonable
         * space to accomodate elements. The key is added to the score to
         * preserve the original relative order of elements.
         *
         * @param {Number} key
         * @param {Array} array
         * @return int
         */
        function sortScore(key, array) {
            var score;
            if (array[key].hasFeature(jsVObject_Component)) {
                // We want to encode VTIMEZONE first, this is a personal
                // preference.
                if (array[key].name == "VTIMEZONE") {
                    score = 300000000;
                    return score + key;
                }
                else {
                    score = 400000000;
                    return score + key;
                }
            }
            else {
                // Properties get encoded first
                // VCARD version 4.0 wants the VERSION property to appear first
                if (array[key].hasFeature(jsVObject_Property)) {
                    if (array[key].name == "VERSION") {
                        score = 100000000;
                        return score + key;
                    }
                    else {
                        // All other properties
                        score = 200000000;
                        return score + key;
                    }
                }
            }
        }

        var tmp = [].concat(this.children);
        this.children.sort(function(a, b) {
            var sA = sortScore(tmp.indexOf(a), tmp);
            var sB = sortScore(tmp.indexOf(b), tmp);

            if (sA === sB)
                return 0;

            return (sA < sB) ? -1 : 1;
        }).forEach(function(child) {
            aStr.push(child.serialize());
        });

        return aStr.join("") + "END:" + this.name + "\r\n";
    },

    /**
     * Adds a new component or element
     *
     * You can call this method with the following syntaxes:
     *
     * add(Node node)
     * add(string name, value, array parameters = array())
     *
     * The first version adds an Element
     * The second adds a property as a string.
     *
     * @param {mixed} item
     * @param {mixed} itemValue
     * @return void
     */
    add: function(item, itemValue, parameters) {
        parameters = parameters || {};
        if (item.hasFeature && item.hasFeature(jsVObject_Node)) {
            if (itemValue)
                throw new Error("The second argument must not be specified, when passing a VObject Node");
            item.parent = this;
            this.children.push(item);
        }
        else if (typeof item == "string") {
            item = jsVObject_Property.create(item, itemValue, parameters);
            item.parent = this;
            this.children.push(item);
        }
        else {
            throw new Error("The first argument must either be a jsVObject_Node or a string");
        }
    },

    /**
     * Returns an array with elements that match the specified name.
     *
     * This function is also aware of MIME-Directory groups (as they appear in
     * vcards). This means that if a property is grouped as "HOME.EMAIL", it
     * will also be returned when searching for just "EMAIL". If you want to
     * search for a property in a specific group, you can select on the entire
     * string ("HOME.EMAIL"). If you want to search on a specific property that
     * has not been assigned a group, specify ".EMAIL".
     *
     * Keys are retained from the 'children' array, which may be confusing in
     * certain cases.
     *
     * @param {String} name
     * @return array
     */
    select: function(name) {
        var group = null;
        name = name.toUpperCase();
        if (name.indexOf(".") > -1) {
            var parts = name.split(".");
            group = parts[0];
            name = parts[1];
        }

        var result = [];
        this.children.forEach(function(child, key) {
            if (
                child.name.toUpperCase() === name &&
                (!group || (child.hasFeature(jsVObject_Property) && child.group.toUpperCase() === group))
            ) {
                //result[key] = child;
                result.push(child);
            }
        });

        return result;
    },

    /**
     * This method only returns a list of sub-components. Properties are
     * ignored.
     *
     * @return {Array}
     */
    getComponents: function() {
        return this.getChildren().filter(function(child) {
            return child.hasFeature(jsVObject_Component);
        });
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
        var result = [];
        this.children.forEach(function(child) {
            result = result.concat(child.validate(options));
        });
        return result;
    },

    /**
     * Using the setter method you can add properties or subcomponents
     *
     * You can either pass a Component, Property
     * object, or a string to automatically create a Property.
     *
     * If the item already exists, it will be removed. If you want to add
     * a new item with the same name, always use the add() method.
     *
     * @param {String} name
     * @param {mixed} value
     * @return void
     */
    set: function(name, value) {
        var matches = this.select(name);
        var overWrite = matches.length ? this.children.indexOf(matches[0]) : null;
        if (value.hasFeature && (value.hasFeature(jsVObject_Component) || value.hasFeature(jsVObject_Property))) {
            value.parent = this;
            if (overWrite !== null)
                this.children[overWrite] = value;
            else
                this.children.push(value);
        }
        else if (Util.isScalar(value)) {
            var property = jsVObject_Property.create(name, value);
            property.parent = this;
            if (overWrite !== null)
                this.children[overWrite] = property;
            else
                this.children.push(property);
        }
        else {
            throw new Error("You must pass a jsVObject_Component, jsVObject_Property or scalar type");
        }
    }


});
