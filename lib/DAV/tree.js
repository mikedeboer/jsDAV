/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var Base = require("./../shared/base");
// interfaces to check for:
var jsDAV_iFile = require("./interfaces/iFile");
var jsDAV_iCollection = require("./interfaces/iCollection");
var jsDAV_iProperties = require("./interfaces/iProperties");

var Exc = require("./../shared/exceptions");
var Util  = require("./../shared/util");
var Path = require("path");

/**
 * Abstract tree object
 */
var jsDAV_Tree = module.exports = Base.extend({
    /**
     * Chunk of the path that is part of the sandbox
     *
     * @var string
     */
    sandbox: null,

    /**
     * Set the path that needs to be stripped from the real path when presented
     * to the user/ client and to check if a path from a request is within this
     * path to prevent operations to files and directories that are outside of
     * this sandbox
     *
     * @param {string} path
     * @return void
     */
    setSandbox: function(path) {
        this.sandbox = path.replace(/[\/]+$/, "");
    },

    /**
     * Strips the sandbox part from the path.
     *
     * @var {string} path
     * @return string
     */
    stripSandbox: function(path) {
        if (!this.sandbox)
            return path;
        var idx = path.indexOf(this.sandbox);
        if (idx === -1)
            return path;
        // remove the sandbox path from full path, usually at the start of the string
        return path.substr(idx + this.sandbox.length);
    },

    /**
     * Check whether the provided path is located inside the sandbox
     *
     * @param {string} path
     * @return boolean
     */
    insideSandbox: function(path) {
        if (!this.sandbox)
            return true;
        // if the relative path FROM the sandbox directory TO the requested path
        // is outside of the sandbox directory, the result of Path.relative() will
        // start with '../', which we can trap and use:
        return Path.relative(this.sandbox, path).indexOf("../") !== 0;
    },

    /**
     * This function must return an iNode object for a path
     * If a Path doesn't exist, thrown an jsDAV_Exception_FileNotFound
     *
     * @param string path
     * @throws Exception_FileNotFound
     * @return jsDAV_iNode
     */
    getNodeForPath: function(path, cbgetnodefp) {},

    /**
     * Copies a file from path to another
     *
     * @param {string} sourcePath The source location
     * @param {string} destinationPath The full destination path
     * @return void
     */
    copy: function(sourcePath, destinationPath, cbcopytree) {
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
    },

    /**
     * Moves a file from one location to another
     *
     * @param {string} sourcePath The path to the file which should be moved
     * @param {string} destinationPath The full destination path, so not just the destination parent node
     * @return int
     */
    move: function(sourcePath, destinationPath, cbmovetree) {
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
    },

    /**
     * copyNode
     *
     * @param {jsDAV_iNode} source
     * @param {jsDAV_iCollection} destination
     * @return void
     */
    copyNode: function(source, destinationParent, destinationName, cbcopytreenode) {
        if (!destinationName)
            destinationName = source.getName();

        var destination;
        var self = this;

        if (source.hasFeature(jsDAV_iFile)) {
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
        else if (source.hasFeature(jsDAV_iCollection)) {
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
            if (source.hasFeature(jsDAV_iProperties) && destination.hasFeature(jsDAV_iProperties))
                destination.updateProperties(source.getProperties({}), cbcopytreenode);
            else
                cbcopytreenode();
        }
    }
});
