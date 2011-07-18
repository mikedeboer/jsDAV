/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV             = require("./../jsdav"),
    jsDAV_Node        = require("./node").jsDAV_Node,
    jsDAV_iFile       = require("./ifile").jsDAV_iFile,

    Exc               = require("./exceptions");

/**
 * File class
 *
 * This is a helper class, that should aid in getting file classes setup.
 * Most of its methods are implemented, and throw permission denied exceptions
 */
function jsDAV_File() {}

exports.jsDAV_File = jsDAV_File;

(function() {
    this.REGBASE = this.REGBASE | jsDAV.__FILE__;

    this.implement(jsDAV_iFile);

    /**
     * Updates the data
     *
     * data is a readable stream resource.
     *
     * @param resource data
     * @return void
     */
    this.put = function(data, cbfileputabs) {
        cbfileputabs(
            new Exc.jsDAV_Exception_Forbidden("Permission denied to change data")
        );
    };

    /**
     * Returns the data
     *
     * This method may either return a string or a readable stream resource
     *
     * @return mixed
     */
    this.get = function(cbfilegetabs) {
        cbfilegetabs(
            new Exc.jsDAV_Exception_Forbidden("Permission denied to read this file")
        );
    };

    /**
     * Returns the size of the file, in bytes.
     *
     * @return int
     */
    this.getSize = function(cbfilegetsizeabs) {
        cbfilegetsizeabs(null, 0);
    };

    /**
     * Returns the ETag for a file
     *
     * An ETag is a unique identifier representing the current version of the file. If the file changes, the ETag MUST change.
     *
     * Return null if the ETag can not effectively be determined
     */
    this.getETag = function(cbfilegetetagabs) {
        cbfilegetetagabs(null, null);
    };

    /**
     * Returns the mime-type for a file
     *
     * If null is returned, we'll assume application/octet-stream
     */
    this.getContentType = function(cbfilegetctabs) {
        cbfilegetctabs(null, null);
    };
}).call(jsDAV_File.prototype = new jsDAV_Node());
