/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV           = require("./../jsdav"),
    jsDAV_Directory = require("./directory").jsDAV_Directory,

    Util            = require("./util"),
    Exc             = require("./exceptions");

/**
 * SimpleDirectory
 *
 * The SimpleDirectory is used to quickly setup static directory structures.
 * Just create the object with a proper name, and add children to use it.
 *
 * The name of the node must be passed, child nodes can also be bassed.
 * This nodes must be instances of Sabre_DAV_INode
 *
 * @param string name
 * @param array children
 * @return void
 */
function jsDAV_SimpleDirectory(name, children) {
    children = children || [];
    this.name = name;
    for (var child, i = 0, l = children.length; i < l; ++i) {
        child = children[i];
        if (!child.hasFeature || !child.hasFeature(jsDAV.__INODE__))
            throw new Exc.jsDAV_Exception("Only instances of jsDAV_iNode are allowed to be passed in the children argument");
        this.addChild(child);
    }
}

exports.jsDAV_SimpleDirectory = jsDAV_SimpleDirectory;

(function() {
    this.REGBASE = this.REGBASE | jsDAV.__SIMPLEDIR__;
    /**
     * List of childnodes
     *
     * @var array
     */
    this.children = {};

    /**
     * Name of this resource
     *
     * @var string
     */
    this.name;

    /**
     * Adds a new childnode to this collection
     *
     * @param Sabre_DAV_INode child
     * @return void
     */
    this.addChild = function(child) {
        this.children[child.getName()] = child;
    }

    /**
     * Returns the name of the collection
     *
     * @return string
     */
    this.getName = function() {
        return this.name;
    };

    /**
     * Returns a child object, by its name.
     *
     * This method makes use of the getChildren method to grab all the child nodes, and compares the name.
     * Generally its wise to override this, as this can usually be optimized
     *
     * @param string name
     * @throws Sabre_DAV_Exception_FileNotFound
     * @return Sabre_DAV_INode
     */
    this.getChild = function(name) {
        if (this.children[name])
            return this.children[name];
        throw new Exc.jsDAV_Exception_FileNotFound("File not found: " + name);
    };

    /**
     * Returns a list of children for this collection
     *
     * @return array
     */
    this.getChildren = function() {
        return Util.hashValues(this.children);
    };
}).call(jsDAV_SimpleDirectory.prototype = new jsDAV_Directory)