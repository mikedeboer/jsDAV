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
    /**
     * Base path for this tree. Not used for a tree of objects, so keep it blank.
     * 
     * @var {String}
     */
    basePath: "",

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

        // Is it the root node?
        if (!path || !path.length)
            return cbgetnodepath(null, this.rootNode);
        
        // Attempting to fetch its parent
        var parts = Util.splitPath(path);
        var parentName = parts[0];
        var baseName = parts[1];
        var self = this;

        // If there was no parent, we must simply ask it from the root node.
        if (parentName === "") {
            this.rootNode.getChild(baseName, cbgetnodepath);
        }
        else {
            // Otherwise, we recursively grab the parent and ask him/her.
            this.getNodeForPath(parentName, function(err, parent) {
                if (!parent || !parent.hasFeature(jsDAV_iCollection))
                    return cbgetnodepath(new Exc.NotFound("Could not find node at path: " + path));
                
                parent.getChild(baseName, cbgetnodepath);
            });
        }
    },
    
    /**
     * Returns a list of childnodes for a given path.
     *
     * @param {String} path
     * @return array
     */
    getChildren: function(path, cbgetchildren) {
        var self = this;
        this.getNodeForPath(path, function(err, node) {
            if (err)
                return cbgetchildren(err);
                
            node.getChildren(function(err, children) {
                if (err)
                    return cbgetchildren(err);

                cbgetchildren(null, children);
            });
        });
    }
});
