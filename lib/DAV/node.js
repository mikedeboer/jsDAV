/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV       = require("./../jsdav"),
    jsDAV_iNode = require("./iNode").jsDAV_iNode,
    Exc         = require("./exceptions");

/**
 * Node class
 *
 * This is a helper class, that should aid in getting nodes setup.
 */
function jsDAV_Node() {}

exports.jsDAV_Node = jsDAV_Node;

(function() {
    this.REGBASE = this.REGBASE | jsDAV.__NODE__;

    /**
     * Returns the last modification time
     *
     * In this case, it will simply return the current time
     *
     * @return int
     */
    this.getLastModified = function(cbnodelm) {
        cbnodelm(null, new Date());
    };

    /**
     * Deleted the current node
     *
     * @throws Sabre_DAV_Exception_Forbidden
     * @return void
     */
    this["delete"] = function(cbnodedel) {
        cbnodedel(
            new Exc.jsDAV_Exception_Forbidden("Permission denied to delete node")
        );
    };

    /**
     * Renames the node
     *
     * @throws jsDAV_Exception_Forbidden
     * @param string name The new name
     * @return void
     */
    this.setName = function(name, cbnodesetname) {
        cbnodesetname(
            new Exc.jsDAV_Exception_Forbidden("Permission denied to rename file")
        );
    };
}).call(jsDAV_Node.prototype = new jsDAV_iNode());
