/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV      = require("./../jsdav"),
    jsDAV_Tree = require("./tree").jsDAV_Tree,

    Async      = require("./../../support/async.js"),
    Util       = require("./util"),
    Exc        = require("./exceptions");

/**
 * ObjectTree class
 *
 * This implementation of the Tree class makes use of the INode, IFile and ICollection API's
 */
function jsDAV_ObjectTree(rootNode) {
    this.rootNode = rootNode;
}

exports.jsDAV_ObjectTree = jsDAV_ObjectTree;

(function() {
    this.REGBASE = this.REGBASE | jsDAV.__OBJECTTREE__;

    /**
     * Returns the iNode object for the requested path
     *
     * @param {String} path
     * @return jsDAV_iNode
     */
    this.getNodeForPath = function(path, cbgetnodepath) {
        path = Util.trim(path, "/");

        //if (!path || path=='.') return this.rootNode;
        var pathPart,
            currentNode = this.rootNode,
            c           = path.split("/"),
            i           = 0,
            l           = c.length;
        // We're splitting up the path variable into folder/subfolder components
        // and traverse to the correct node..
        Async.range(i, l - 1)
             .each(function(pathPart, cbnextnpath) {
                // If this part of the path is just a dot, it actually means we can skip it
                if (pathPart == "." || pathPart === "")
                    return cbnextnpath();
                if (!currentNode.hasFeature(jsDAV.__ICOLLECTION__))
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
    };
}).call(jsDAV_ObjectTree.prototype = new jsDAV_Tree());
