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
        // we keep a cache dual to the one found in jsDAV_Handler, because of
        // possibly heavy-duty object-store (database) ops internally.
        this.cache = {};
    },

    /**
     * Returns the iNode object for the requested path
     *
     * @param {String} path
     * @return jsDAV_iNode
     */
    getNodeForPath: function(path, cbgetnodepath) {
        path = Util.trim(path, "/");

        // Did we cache it earlier?
        if (this.cache[path])
            return cbgetnodepath(null, this.cache[path]);
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
            this.rootNode.getChild(baseName, afterGetChild);
        }
        else {
            // Otherwise, we recursively grab the parent and ask him/her.
            this.getNodeForPath(parentName, function(err, parent) {
                if (!parent || !parent.hasFeature(jsDAV_iCollection))
                    return cbgetnodepath(new Exc.NotFound("Could not find node at path: " + path));
                
                parent.getChild(baseName, afterGetChild);
            });
        }
        
        function afterGetChild(err, node) {
            if (err)
                return cbgetnodepath(err);
            self.cache[path] = node;
            cbgetnodepath(null, node);
        }
    },
    
    /**
     * Returns a list of childnodes for a given path.
     *
     * @param string path
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
                    
                children.forEach(function(child) {
                    self.cache[Util.trim(path, "/") + "/" + child.getName()] = child;
                });
                cbgetchildren(null, children);
            });
        });
    },
    
    /**
     * This method is called with every tree update
     *
     * Examples of tree updates are:
     *   * node deletions
     *   * node creations
     *   * copy
     *   * move
     *   * renaming nodes
     *
     * If Tree classes implement a form of caching, this will allow
     * them to make sure caches will be expired.
     *
     * If a path is passed, it is assumed that the entire subtree is dirty
     *
     * @param string path
     * @return void
     */
    markDirty: function(path) {
        // We don't care enough about sub-paths
        // flushing the entire cache
        path = Util.trim(path, "/");
        for (var nodePath in this.cache) {
            if (nodePath.indexOf(path) === 0)
                delete this.cache[nodePath];
        }
    }
});
