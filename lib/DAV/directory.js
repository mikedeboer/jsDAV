/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV             = require("./../jsdav"),
    jsDAV_Node        = require("./node").jsDAV_Node,
    jsDAV_iCollection = require("./iCollection").jsDAV_iCollection,

    Exc               = require("./exceptions");

/**
 * Directory class
 *
 * This is a helper class, that should aid in getting directory classes setup.
 * Most of its methods are implemented, and throw permission denied exceptions
 */
function jsDAV_Directory() {}

exports.jsDAV_Directory = jsDAV_Directory;

(function() {
    this.REGBASE = this.REGBASE | jsDAV.__NODE__;

    this.implement(jsDAV_iCollection);

    /**
     * Returns a child object, by its name.
     *
     * This method makes use of the getChildren method to grab all the child nodes,
     * and compares the name.
     * Generally its wise to override this, as this can usually be optimized
     *
     * @param string name
     * @throws jsDAV_Exception_FileNotFound
     * @return jsDAV_INode
     */
    this.getChild = function(name) {
        var child,
            c = this.getChildren(),
            i = 0,
            l = c.length;
        for (; i < l; ++i) {
            child = c[i];
            if (child.getName() == name)
                return child;
        }
        throw new Exc.jsDAV_Exception_FileNotFound("File not found: " + name);
    };

    /**
     * Creates a new file in the directory
     *
     * @param string name Name of the file
     * @param string data Initial payload
     * @throws jsDAV_Exception_Forbidden
     * @return void
     */
    this.createFile = function(name, data) {
        throw new Exc.jsDAV_Exception_Forbidden(
            "Permission denied to create file (filename " + name + ")");
    };

    /**
     * Creates a new subdirectory
     *
     * @param string name
     * @throws jsDAV_Exception_Forbidden
     * @return void
     */
    this.createDirectory = function(name) {
        throw new Exc.jsDAV_Exception_Forbidden("Permission denied to create directory");
    };
}).call(jsDAV_Directory.prototype = new jsDAV_Node());