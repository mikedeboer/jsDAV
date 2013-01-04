/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var Base = require("./../../shared/base");

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
    "delete": function() {},

    /**
     * Returns the name of the node
     *
     * @return string
     */
    getName: function() {},

    /**
     * Renames the node
     *
     * @param string $name The new name
     * @return void
     */
    setName: function() {},

    /**
     * Returns the last modification time, as a unix timestamp
     *
     * @return int
     */
    getLastModified: function() {},

    /**
     * Returns whether a node exists or not
     *
     * @return {Boolean}
     */
    exists: function() {}
});
