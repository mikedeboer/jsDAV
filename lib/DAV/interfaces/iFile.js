/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var Base = require("./../../shared/base");

/**
 * This interface represents a file or leaf in the tree.
 *
 * The nature of a file is, as you might be aware of, that it doesn't contain sub-nodes and has contents
 */
var jsDAV_iFile = module.exports = Base.extend({
    /**
     * Updates the data
     *
     * The data argument is a readable stream resource.
     *
     * @param resource $data
     * @return void
     */
    put: function() {},

    /**
     * Returns the data
     *
     * This method may either return a string or a readable stream resource
     *
     * @return mixed
     */
    get: function() {},

    /**
     * Returns the mime-type for a file
     *
     * If null is returned, we'll assume application/octet-stream
     *
     * @return void
     */
    getContentType: function() {},

    /**
     * Returns the ETag for a file
     *
     * An ETag is a unique identifier representing the current version of the file. If the file changes, the ETag MUST change.
     *
     * Return null if the ETag can not effectively be determined
     *
     * @return void
     */
    getETag: function() {},

    /**
     * Returns the size of the node, in bytes
     *
     * @return int
     */
    getSize: function() {}
});
