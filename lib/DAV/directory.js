/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV             = require("./../jsdav"),
    jsDAV_Node        = require("./node").jsDAV_Node,
    jsDAV_iCollection = require("./iCollection").jsDAV_iCollection,

    Exc               = require("./exceptions");

/**
 * Directory class
 *
 * This is a helper class, that should aid in getting directory classes setup.
 * Most of its methods are implemented, and throw permission denied exceptions
 */
function jsDAV_Directory() {
    this.REGBASE = this.REGBASE | jsDAV.__NODE__;

    /**
     * Returns a child object, by its name.
     *
     * This method makes use of the getChildren method to grab all the child nodes,
     * and compares the name.
     * Generally its wise to override this, as this can usually be optimized
     *
     * @param string name
     * @throws jsDAV_Exception_FileNotFound
     * @return jsDAV_INode
     */
    this.getChild = function(name, cbgetchildabs) {
        this.getChildren(function(err, c) {
            var child,
                i = 0,
                l = c.length;
            for (; i < l; ++i) {
                child = c[i];
                if (child.getName() == name)
                    return cbgetchildabs(null, child);
            }
            cbgetchildabs(new Exc.jsDAV_Exception_FileNotFound("File not found: " + name));
        });
    };

    /**
     * Creates a new file in the directory
     *
     * @param string name Name of the file
     * @param string data Initial payload
     * @throws jsDAV_Exception_Forbidden
     * @return void
     */
    this.createFile = function(name, data, cbcreatefileabs) {
        cbcreatefileabs(new Exc.jsDAV_Exception_Forbidden(
            "Permission denied to create file (filename " + name + ")")
        );
    };

    /**
     * Creates a new subdirectory
     *
     * @param string name
     * @throws jsDAV_Exception_Forbidden
     * @return void
     */
    this.createDirectory = function(name, cbcreatedirabs) {
        cbcreatedirabs(
            new Exc.jsDAV_Exception_Forbidden("Permission denied to create directory")
        );
    };
}

exports.jsDAV_Directory = jsDAV_Directory;
