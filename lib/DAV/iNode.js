/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV = require("./../jsdav");
var Exc = require('./exceptions');

/**
 * The iNode interface is the base interface, and the parent class of both
 * iCollection and iFile
 */
function jsDAV_iNode() {
    this.REGBASE = this.REGBASE | jsDAV.__INODE__;

    /**
     * Deleted the current node
     *
     * @return void
     */
    this["delete"] = this["delete"] || function(callback) {
        callback(new Exc.jsDAV_Exception_Forbidden());
    }

    /**
     * Returns the name of the node
     *
     * @return string
     */
    this.getName = this.getName || function() {
        return undefined;
    }

    /**
     * Renames the node
     *
     * @param string $name The new name
     * @return void
     */
    this.setName = this.setName || function(name, callback) {
        callback(new Exc.jsDAV_Exception_Forbidden());
    }

    /**
     * Returns the last modification time, as a unix timestamp
     *
     * @return int
     */
    this.getLastModified = this.getLastModified || function(callback) {
        callback(null, null);
    }
}

exports.jsDAV_iNode = jsDAV_iNode;
