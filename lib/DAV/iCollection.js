/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV       = require("./../jsdav"),
    jsDAV_iNode = require("./iNode").jsDAV_iNode;

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
    this.createFile = function() {};

    /**
     * Creates a new subdirectory
     *
     * @param string name
     * @return void
     */
    this.createDirectory = function() {};

    /**
     * Returns a specific child node, referenced by its name
     *
     * @param string name
     * @return jsDAV_INode
     */
    this.getChild = function() {};

    /**
     * Returns an array with all the child nodes
     *
     * @return jsDAV_INode[]
     */
    this.getChildren = function() {};
}

exports.jsDAV_iCollection = jsDAV_iCollection;
