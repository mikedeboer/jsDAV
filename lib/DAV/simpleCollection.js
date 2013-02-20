/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV = require("./../jsdav");
var jsDAV_Collection = require("./collection");
var jsDAV_iNode = require("./interfaces/iNode");

var Exc = require("./../shared/exceptions");

/**
 * jsDAV_SimpleCollection
 *
 * The SimpleCollection is used to quickly setup static directory structures.
 * Just create the object with a proper name, and add children to use it.
 *
 * The name of the node must be passed, child nodes can also be bassed.
 * This nodes must be instances of Sabre_DAV_INode
 *
 * @param {String} name
 * @param {Array} children
 * @return void
 */
var jsDAV_SimpleCollection = module.exports = jsDAV_Collection.extend({
    initialize: function(name, children) {
        children = children || {};
        this.name = name;
        for (var child, i = 0, l = children.length; i < l; ++i) {
            child = children[i];
            if (!child.hasFeature(jsDAV_iNode))
                throw new Exc.jsDAV_Exception("Only instances of jsDAV_iNode are allowed to be passed in the children argument");
            this.addChild(child);
        }
    },

    /**
     * List of childnodes
     *
     * @var array
     */
    children: {},

    /**
     * Name of this resource
     *
     * @var string
     */
    name: null,

    /**
     * Adds a new childnode to this collection
     *
     * @param Sabre_DAV_INode child
     * @return void
     */
    addChild: function(child) {
        this.children[child.getName()] = child;
    },

    /**
     * Returns the name of the collection
     *
     * @return string
     */
    getName: function() {
        return this.name;
    },

    /**
     * Returns a child object, by its name.
     *
     * This method makes use of the getChildren method to grab all the child nodes, and compares the name.
     * Generally its wise to override this, as this can usually be optimized
     *
     * @param {String} name
     * @throws Exc.FileNotFound
     * @return jsDAV_iNode
     */
    getChild: function(name, callback) {
        if (this.children[name])
            callback(null, this.children[name]);
        else
            callback(new Exc.FileNotFound("File not found: " + name));
    },

    /**
     * Returns a list of children for this collection
     *
     * @return array
     */
    getChildren: function(callback) {
        var self = this;
        var childlist = Object.keys(this.children).map(function(name) {
            return self.children[name];
        });

        callback(null, childlist);
    }
});
