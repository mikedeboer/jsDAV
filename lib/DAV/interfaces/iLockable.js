/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_iNode = require("./iNode");

/**
 * Implement this class to support locking
 */
var jsDAV_iLockable = module.exports = jsDAV_iNode.extend({
    /**
     * Returns an array with locks currently on the node
     *
     * @return jsDAV_Locks_LockInfo[]
     */
    getLocks: function() {},

    /**
     * Creates a new lock on the file.
     *
     * @param {jsDAV_Locks_LockInfo} lockInfo The lock information
     * @return void
     */
    lock: function() {},

    /**
     * Unlocks a file
     *
     * @param {jsDAV_Locks_LockInfo} lockInfo The lock information
     * @return void
     */
    unlock: function() {}
});
