/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
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
        var _self = this;
        this.getNodeForPath(sourcePath, function(err, sourceNode) {
            if (err)
                return cbcopytree(err);
            // grab the dirname and basename components
            var parts           = Util.splitPath(destinationPath),
                destinationDir  = parts[0],
                destinationName = parts[1];

            _self.getNodeForPath(destinationDir, function(err, destinationParent) {
                if (err)
                    return cbcopytree(err);
                _self.copyNode(sourceNode, destinationParent, destinationName, cbcopytree);
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
        var parts      = Util.splitPath(sourcePath),
            sourceDir  = parts[0],
            sourceName = parts[1];
        parts = Util.splitPath(destinationPath);
        var destinationDir  = parts[0],
            destinationName = parts[1];

        if (sourceDir === destinationDir) {
            this.getNodeForPath(sourcePath, function(err, renameable) {
                if (err)
                    return cbmovetree(err);
                renameable.setName(destinationName, cbmovetree);
            });
        }
        else {
            var _self = this;
            this.copy(sourcePath, destinationPath, function(err) {
                if (err)
                    return cbmovetree(err);
                _self.getNodeForPath(sourcePath)["delete"](cbmovetree);
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

        var destination,
            _self = this;

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
                    var child,
                        c       = source.getChildren(),
                        i       = 0,
                        l       = c.length,
                        error   = null,
                        onError = function(err) {
                            if (err)
                                error = err;
                        };
                    for (; i < l && !error; ++i) {
                        child = c[i];
                        _self.copyNode(child, destination, onError);
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
