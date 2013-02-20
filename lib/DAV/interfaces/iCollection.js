/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var Base = require("./../../shared/base");
var Exc = require("./../../shared/exceptions");

/**
 * The iCollection Interface
 *
 * This interface should be implemented by each class that represents a collection
 */
var jsDAV_iCollection = module.exports = Base.extend({
    /**
     * Creates a new file in the directory
     *
     * data is a readable stream resource
     *
     * @param {String} name Name of the file
     * @param resource data Initial payload
     * @return void
     */
    createFile: function(name, vcardData, callback) { callback(Exc.notImplementedYet()); },

    /**
     * Creates a new subdirectory
     *
     * @param {String} name
     * @return void
     */
    createDirectory: function(name, callback) { callback(Exc.notImplementedYet()); },

    /**
     * Returns a specific child node, referenced by its name
     *
     * @param {String} name
     * @return jsDAV_INode
     */
    getChild: function(name, callback) { callback(Exc.notImplementedYet()); },

    /**
     * Returns an array with all the child nodes
     *
     * @return jsDAV_INode[]
     */
    getChildren: function(callback) { callback(Exc.notImplementedYet()); }
});
