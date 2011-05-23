/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV       = require("./../jsdav"),
    jsDAV_iNode = require("./iNode").jsDAV_iNode;

/**
 * Implement this class to support locking
 */
function jsDAV_iLockable() {}

exports.jsDAV_iLockable = jsDAV_iLockable;
    this.REGBASE = this.REGBASE | jsDAV.__ILOCKABLE__;

    /**
     * Returns an array with locks currently on the node
     *
     * @return jsDAV_Locks_LockInfo[]
     */
    this.getLocks = function() {};

    /**
     * Creates a new lock on the file.
     *
     * @param {jsDAV_Locks_LockInfo} lockInfo The lock information
     * @return void
     */
    this.lock = function() {};

    /**
     * Unlocks a file
     *
     * @param {jsDAV_Locks_LockInfo} lockInfo The lock information
     * @return void
     */
    this.unlock = function() {};
(function() {

}).call(jsDAV_iLockable.prototype = new jsDAV_iNode());
