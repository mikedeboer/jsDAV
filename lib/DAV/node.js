/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_iNode = require("./interfaces/iNode");
var Exc = require("./../shared/exceptions");

/**
 * Node class
 *
 * This is a helper class, that should aid in getting nodes setup.
 */
var jsDAV_Node = module.exports = jsDAV_iNode.extend({
    /**
     * Returns the last modification time
     *
     * In this case, it will simply return the current time
     *
     * @return int
     */
    getLastModified: function(cbnodelm) {
        cbnodelm(null, new Date());
    },

    /**
     * Deleted the current node
     *
     * @throws Sabre_DAV_Exception_Forbidden
     * @return void
     */
    "delete": function(cbnodedel) {
        cbnodedel(
            new Exc.jsDAV_Exception_Forbidden("Permission denied to delete node")
        );
    },

    /**
     * Renames the node
     *
     * @throws jsDAV_Exception_Forbidden
     * @param string name The new name
     * @return void
     */
    setName: function(name, cbnodesetname) {
        cbnodesetname(
            new Exc.jsDAV_Exception_Forbidden("Permission denied to rename file")
        );
    }
});
