/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV = require("./../jsdav"),
    Util  = require("./util");

/**
 * Abstract tree object
 */
function jsDAV_Tree() {}

exports.jsDAV_Tree = jsDAV_Tree;

(function() {
    this.REGBASE = this.REGBASE | jsDAV.__TREE__;

    /**
     * This function must return an INode object for a path
     * If a Path doesn't exist, thrown an Exception_FileNotFound
     *
     * @param string path
     * @throws Exception_FileNotFound
     * @return jsDAV_INode
     */
    this.getNodeForPath = function(path) {};

    /**
     * Copies a file from path to another
     *
     * @param {string} sourcePath The source location
     * @param {string} destinationPath The full destination path
     * @return void
     */
    this.copy = function(sourcePath, destinationPath) {
        var sourceNode = this.getNodeForPath(sourcePath);

        // grab the dirname and basename components
        var parts           = Util.splitPath(destinationPath),
            destinationDir  = parts[0],
            destinationName = parts[1];

        var destinationParent = this.getNodeForPath(destinationDir);
        return this.copyNode(sourceNode, destinationParent, destinationName);
    };

    /**
     * Moves a file from one location to another
     *
     * @param {string} sourcePath The path to the file which should be moved
     * @param {string} destinationPath The full destination path, so not just the destination parent node
     * @return int
     */
    this.move = function(sourcePath, destinationPath) {
        var parts      = Util.splitPath(sourcePath),
            sourceDir  = parts[0],
            sourceName = parts[1];
        parts = Util.splitPath(destinationPath);
        var destinationDir  = parts[0],
            destinationName = parts[1];

        if (sourceDir === destinationDir) {
            var renameable = this.getNodeForPath(sourcePath);
            renameable.setName(destinationName);
        }
        else {
            this.copy(sourcePath, destinationPath);
            this.getNodeForPath(sourcePath)["delete"]();
        }
    };

    /**
     * copyNode
     *
     * @param {jsDAV_iNode} source
     * @param {jsDAV_iCollection} destination
     * @return void
     */
    this.copyNode = function(source, destinationParent, destinationName) {
        if (!destinationName)
            destinationName = source.getName();

        var destination;

        if (source.hasFeature(jsDAV.__IFILE__)) {
            var data = source.get();
            // If the body was a string, we need to convert it to a stream
            if (typeof data == "string") {
                var stream = fopen('php://temp','r+');
                fwrite(stream, data);
                rewind(stream);
                data = stream;
            }
            destinationParent.createFile(destinationName, data);
            destination = destinationParent.getChild(destinationName);
        }
        else if (source.hasFeature(jsDAV.__ICOLLECTION__)) {
            destinationParent.createDirectory(destinationName);
            destination = destinationParent.getChild(destinationName);
            var child,
                c = source.getChildren(),
                i = 0,
                l = c.length;
            for (; i < l; ++i) {
                child = c[i];
                this.copyNode(child, destination);
            }
        }
        if (source.hasFeature(jsDAV.__IPROPERTIES__) && destination.hasFeature(jsDAV.__IPROPERTIES__)) {
            destination.updateProperties(source.getProperties({}));
        }
    };
}).call(jsDAV_Tree.prototype = new jsDAV.jsDAV_Base());
