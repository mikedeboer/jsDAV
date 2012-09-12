/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV = require("./../jsdav");
var Exc = require("./exceptions");
var Util  = require("./util");
var Path = require("path");

/**
 * Abstract tree object
 */
function jsDAV_Tree() {}

exports.jsDAV_Tree = jsDAV_Tree;

(function() {
    this.REGBASE = this.REGBASE | jsDAV.__TREE__;

    /**
     * Chunk of the path that is part of the sandbox
     *
     * @var string
     */
    this.sandbox = null;

    /**
     * Set the path that needs to be stripped from the real path when presented
     * to the user/ client and to check if a path from a request is within this
     * path to prevent operations to files and directories that are outside of
     * this sandbox
     *
     * @param {string} path
     * @return void
     */
    this.setSandbox = function(path) {
        this.sandbox = path.replace(/[\/]+$/, "");
    };

    /**
     * Strips the sandbox part from the path.
     *
     * @var {string} path
     * @return string
     */
    this.stripSandbox = function(path) {
        if (!this.sandbox)
            return path;
        var idx = path.indexOf(this.sandbox);
        if (idx === -1)
            return path;
        // remove the sandbox path from full path, usually at the start of the string
        return path.substr(idx + this.sandbox.length);
    };

    /**
     * Check whether the provided path is located inside the sandbox
     *
     * @param {string} path
     * @return boolean
     */
    this.insideSandbox = function(path) {
        if (!this.sandbox)
            return true;
        // if the relative path FROM the sandbox directory TO the requested path
        // is outside of the sandbox directory, the result of Path.relative() will
        // start with '../', which we can trap and use:
        return Path.relative(this.sandbox, path).indexOf("../") !== 0;
    };

    /**
     * This function must return an iNode object for a path
     * If a Path doesn't exist, thrown an jsDAV_Exception_FileNotFound
     *
     * @param string path
     * @throws Exception_FileNotFound
     * @return jsDAV_iNode
     */
    this.getNodeForPath = function(path, cbgetnodefp) {};

    /**
     * Copies a file from path to another
     *
     * @param {string} sourcePath The source location
     * @param {string} destinationPath The full destination path
     * @return void
     */
    this.copy = function(sourcePath, destinationPath, cbcopytree) {
        var self = this;
        if (!this.insideSandbox(destinationPath)) {
            return cbcopytree(new Exc.jsDAV_Exception_Forbidden("You are not allowed to copy to " +
                this.stripSandbox(destinationPath)));
        }
        this.getNodeForPath(sourcePath, function(err, sourceNode) {
            if (err)
                return cbcopytree(err);
            // grab the dirname and basename components
            var parts           = Util.splitPath(destinationPath);
            var destinationDir  = parts[0];
            var destinationName = parts[1];

            self.getNodeForPath(destinationDir, function(err, destinationParent) {
                if (err)
                    return cbcopytree(err);
                self.copyNode(sourceNode, destinationParent, destinationName, cbcopytree);
            });
        });
    };

    /**
     * Moves a file from one location to another
     *
     * @param {string} sourcePath The path to the file which should be moved
     * @param {string} destinationPath The full destination path, so not just the destination parent node
     * @return int
     */
    this.move = function(sourcePath, destinationPath, cbmovetree) {
        var parts      = Util.splitPath(sourcePath);
        var sourceDir  = parts[0];
        var sourceName = parts[1];
        parts = Util.splitPath(destinationPath);
        if (!this.insideSandbox(destinationPath)) {
            return cbmovetree(new Exc.jsDAV_Exception_Forbidden("You are not allowed to move to " +
                this.stripSandbox(destinationPath)));
        }
        var destinationDir  = parts[0];
        var destinationName = parts[1];

        if (sourceDir === destinationDir) {
            this.getNodeForPath(sourcePath, function(err, renameable) {
                if (err)
                    return cbmovetree(err);
                renameable.setName(destinationName, cbmovetree);
            });
        }
        else {
            var self = this;
            this.copy(sourcePath, destinationPath, function(err) {
                if (err)
                    return cbmovetree(err);
                self.getNodeForPath(sourcePath)["delete"](cbmovetree);
            });
        }
    };

    /**
     * copyNode
     *
     * @param {jsDAV_iNode} source
     * @param {jsDAV_iCollection} destination
     * @return void
     */
    this.copyNode = function(source, destinationParent, destinationName, cbcopytreenode) {
        if (!destinationName)
            destinationName = source.getName();

        var destination;
        var self = this;

        if (source.hasFeature(jsDAV.__IFILE__)) {
            source.get(function(err, data) {
                if (err)
                    return cbcopytreenode(err);
                destinationParent.createFile(destinationName, data, function(err) {
                    if (err)
                        return cbcopytreenode(err);
                    destinationParent.getChild(destinationName, function(err, destination) {
                        if (err)
                            return cbcopytreenode(err);
                        afterCopy(destination);
                    });
                });
            });
        }
        else if (source.hasFeature(jsDAV.__ICOLLECTION__)) {
            destinationParent.createDirectory(destinationName, function(err) {
                if (err)
                    return cbcopytreenode(err);
                destinationParent.getChild(destinationName, function(err, destination) {
                    if (err)
                        return cbcopytreenode(err);
                    var child;
                    var c       = source.getChildren();
                    var i       = 0;
                    var l       = c.length;
                    var error   = null;
                    var onError = function(err) {
                        if (err)
                            error = err;
                    };
                    for (; i < l && !error; ++i) {
                        child = c[i];
                        self.copyNode(child, destination, onError);
                    }
                    if (error)
                        return cbcopytreenode(error);
                    afterCopy(destination);
                });
            });

        }

        function afterCopy(destination) {
            if (source.hasFeature(jsDAV.__IPROPERTIES__) && destination.hasFeature(jsDAV.__IPROPERTIES__))
                destination.updateProperties(source.getProperties({}), cbcopytreenode);
            else
                cbcopytreenode();
        }
    };
}).call(jsDAV_Tree.prototype = new jsDAV.jsDAV_Base());
