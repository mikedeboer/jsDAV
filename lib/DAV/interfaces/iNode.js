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
 * The iNode interface is the base interface, and the parent class of both
 * iCollection and iFile
 */
var jsDAV_iNode = module.exports = Base.extend({
    /**
     * Deleted the current node
     *
     * @return void
     */
    "delete": function(callback) { callback(Exc.notImplementedYet()); },

    /**
     * Returns the name of the node
     *
     * @return string
     */
    getName: function() { throw Exc.notImplementedYet(); },

    /**
     * Renames the node
     *
     * @param {String} name The new name
     * @return void
     */
    setName: function(name, callback) { callback(Exc.notImplementedYet()); },

    /**
     * Returns the last modification time, as a unix timestamp
     *
     * @return int
     */
    getLastModified: function(callback) { callback(Exc.notImplementedYet()); },

    /**
     * Returns whether a node exists or not
     *
     * @return {Boolean}
     */
    exists: function(callback) { callback(Exc.notImplementedYet()); }
});
