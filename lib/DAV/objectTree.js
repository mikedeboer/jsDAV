/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV = require("./../jsdav");
var jsDAV_Tree = require("./tree");
var jsDAV_iCollection = require("./interfaces/iCollection");

var Async = require("asyncjs");
var Util = require("./../shared/util");
var Exc = require("./../shared/exceptions");

/**
 * ObjectTree class
 *
 * This implementation of the Tree class makes use of the INode, IFile and ICollection API's
 */
var jsDAV_ObjectTree = module.exports = jsDAV_Tree.extend({
    initialize: function(rootNode) {
        this.rootNode = rootNode;
    },

    /**
     * Returns the iNode object for the requested path
     *
     * @param {String} path
     * @return jsDAV_iNode
     */
    getNodeForPath: function(path, cbgetnodepath) {
        path = Util.trim(path, "/");

        //if (!path || path=='.') return this.rootNode;
        var currentNode = this.rootNode;
        var c           = path.split("/");
        // We're splitting up the path variable into folder/subfolder components
        // and traverse to the correct node..
        Async.list(c)
             .each(function(pathPart, cbnextnpath) {
                // If this part of the path is just a dot, it actually means we can skip it
                if (pathPart == "." || pathPart === "")
                if (!currentNode || !currentNode.hasFeature(jsDAV_iCollection))
                    return cbnextnpath();
                    return cbnextnpath(new Exc.jsDAV_Exception_FileNotFound("Could not find node at path: " + path));

                currentNode.getChild(pathPart, function(err, crt) {
                    if (err)
                        return cbnextnpath(err);
                    currentNode = crt;
                    cbnextnpath();
                });
             })
             .end(function(err) {
                 if (err)
                     return cbgetnodepath(err);
                 cbgetnodepath(null, currentNode);
             });
    }
});
