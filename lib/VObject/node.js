/*
 * @package jsDAV
 * @subpackage VObject
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var Base = require("../shared/base");

/**
 * Base class for all nodes
 */
var jsVObject_Node = module.exports = Base.extend({
    /**
     * The following constants are used by the validate() method.
     */
    REPAIR: 1,

    /**
     * Turns the object back into a serialized blob.
     *
     * @return string
     */
    serialize: function() {},

    /**
     * A link to the parent node
     *
     * @var Node
     */
    parent: null,

    children: null,

    /**
     * Returns an iterable list of children
     *
     * @return {Array}
     */
    getChildren: function() {
        return this.children;
    },

    /**
     * Returns an array with elements that match the specified name.
     *
     * @param {String} name
     * @return {Array}
     */
    select: function(name) {

        return this.getChildren().filter(function(child) {
            return child.name == name;
        });
    },

    /**
     * Using 'get' you will either get a property or component,
     *
     * If there were no child-elements found with the specified name,
     * null is returned.
     *
     * @param {String} name
     * @return {jsVObject_Node}
     */
    get: function(name) {
        var matches = this.select(name);
        if (matches.length === 0) {
            return null;
        }
        else {
            return matches[0];
        }
    },

    /**
     * This method checks if a sub-element with the specified name exists.
     *
     * @param {String} name
     * @return bool
     */
    isset: function(name) {
        var matches = this.select(name);
        return matches.length > 0;
    },

    /**
     * Removes all properties and components within this component.
     *
     * @param {String} name
     * @return void
     */
    unset: function(name) {
        var matches = this.select(name);
        for (var i = matches.length - 1; i >= 0; --i) {
            this.children.splice(this.children.indexOf(matches[i]), 1);
            matches[i].parent = null;
        }
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
     * @return {Array}
     */
    validate: function(options) {
        options = options || 0;
        return [];
    },

    /**
     * This method is automatically called when the object is cloned.
     * Specifically, this will ensure all child elements are also cloned.
     *
     * @return void
     */
    clone: function() {
        for (var i = 0, l = this.children.length; i < l; ++i) {
            this.children[i] = this.children[i].clone();
            this.children[i].parent = this;
        }
    }
});
