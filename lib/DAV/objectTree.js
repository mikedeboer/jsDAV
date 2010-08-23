var jsDAV      = require("./../jsdav"),
    jsDAV_Tree = require("./tree").jsDAV_Tree,
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
    this.getNodeForPath = function(path) {
        path = Util.trim(path, "/");

        //if (!path || path=='.') return this.rootNode;
        var pathPart,
            currentNode = this.rootNode,
            c           = path.split("/"),
            i           = 0,
            l           = c.length;
        // We're splitting up the path variable into folder/subfolder components
        // and traverse to the correct node..
        for (; i < l; ++i) {
            pathPart = c[i];
            // If this part of the path is just a dot, it actually means we can skip it
            if (pathPart == "." || pathPart == "") continue;
            if (!currentNode.hasFeature(jsDAV.__ICOLLECTION__))
                throw new Exc.jsDAV_Exception_FileNotFound("Could not find node at path: " + path);

            currentNode = currentNode.getChild(pathPart);
        }

        return currentNode;
    };
}).call(jsDAV_ObjectTree.prototype = new jsDAV_Tree());
