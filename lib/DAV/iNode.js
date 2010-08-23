var jsDAV = require("./../jsdav");

/**
 * The iNode interface is the base interface, and the parent class of both
 * iCollection and iFile
 */
function jsDAV_iNode() {}

exports.jsDAV_iNode = jsDAV_iNode;

(function() {
    this.REGBASE = this.REGBASE | jsDAV.__INODE__;

    /**
     * Deleted the current node
     *
     * @return void
     */
    this["delete"] = function() {};

    /**
     * Returns the name of the node
     *
     * @return string
     */
    this.getName = function() {};

    /**
     * Renames the node
     *
     * @param string $name The new name
     * @return void
     */
    this.setName = function(name) {};

    /**
     * Returns the last modification time, as a unix timestamp
     *
     * @return int
     */
    this.getLastModified = function() {};
}).call(jsDAV_iNode.prototype = new jsDAV.jsDAV_Base());
