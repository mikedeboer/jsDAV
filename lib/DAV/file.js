/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
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
    this.put = function(data, callback) {
        callback(
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
    this.get = function(callback) {
        callback(
            new Exc.jsDAV_Exception_Forbidden("Permission denied to read this file")
        );
    };

    /**
     * Returns the size of the file, in bytes.
     *
     * @return int
     */
    this.getSize = function(callback) {
        callback(null, 0);
    };

    /**
     * Returns the ETag for a file
     *
     * An ETag is a unique identifier representing the current version of the file. If the file changes, the ETag MUST change.
     *
     * Return null if the ETag can not effectively be determined
     */
    this.getETag = function(callback) {
        callback(null, null);
    };

    /**
     * Returns the mime-type for a file
     *
     * If null is returned, we'll assume application/octet-stream
     */
    this.getContentType = function(callback) {
        callback(null, null);
    };
}).call(jsDAV_File.prototype = new jsDAV_Node());
