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
 * The iCollection Interface
 *
 * This interface should be implemented by each class that represents a collection
 */
function jsDAV_iCollection() {
    this.REGBASE = this.REGBASE | jsDAV.__ICOLLECTION__;

    /**
     * Creates a new file in the directory
     *
     * data is a readable stream resource
     *
     * @param string name Name of the file
     * @param resource data Initial payload
     * @return void
     */
    this.createFile = function(name, data, callback) {
        throw new Exc.jsDAV_Exception_MethodNotAllowed('Creating new files in this collection is not supported');
    }

    /**
     * Creates a new subdirectory
     *
     * @param string name
     * @return void
     */
    this.createDirectory = function(name, callback) {
        throw new Exc.jsDAV_Exception_MethodNotAllowed('Creating new collections in this collection is not supported');
    }

    /**
     * Returns a specific child node, referenced by its name
     *
     * @param string name
     * @return jsDAV_INode
     */
    this.getChild = function(name, callback) {};

    /**
     * Returns an array with all the child nodes
     *
     * @return jsDAV_INode[]
     */
    this.getChildren = function(callback) {};
}

exports.jsDAV_iCollection = jsDAV_iCollection;
