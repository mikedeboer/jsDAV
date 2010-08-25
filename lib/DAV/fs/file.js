/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV           = require("./../jsdav"),
    jsDAV_FS_Node   = require("./node").jsDAV_FS_Node,
    jsDAV_Directory = require("./../directory").jsDAV_Directory,
    jsDAV_iFile     = require("./../iFile").jsDAV_iFile,

    Fs              = require("fs"),
    Exc             = require("./../exceptions");

function jsDAV_FS_File(path) {
    this.path = path;
}

exports.jsDAV_FS_File = jsDAV_FS_File;

(function() {
    this.implement(jsDAV_iFile);

    /**
     * Updates the data
     *
     * @param {mixed} data
     * @return void
     */
    this.put = function(data, callback) {
        Fs.writeFile(this.path, data, callback)
    };

    /**
     * Returns the data
     *
     * @return string
     */
    this.get = function(callback) {
        Fs.readFile(this.path, callback)
    };

    /**
     * Delete the current file
     *
     * @return void
     */
    this["delete"] = function(callback) {
        Fs.unlink(this.path, callback);
    };

    /**
     * Returns the size of the node, in bytes
     *
     * @return int
     */
    this.getSize = function(callback) {
        return Fs.stat(this.path, function(err, stat) {
            if (err || !stat) {
                return callback(new Exc.jsDAV_Exception_FileNotFound("File at location " 
                    + this.path + " not found"));
            }
            callback(null, stat.size);
        });
    };

    /**
     * Returns the ETag for a file
     * An ETag is a unique identifier representing the current version of the file.
     * If the file changes, the ETag MUST change.
     * Return null if the ETag can not effectively be determined
     *
     * @return mixed
     */
    this.getETag = function(callback) {
        return null;
    };

    /**
     * Returns the mime-type for a file
     *
     * If null is returned, we'll assume application/octet-stream
     *
     * @return mixed
     */
    this.getContentType = function(callback) {
        return null;
    };
}).call(jsDAV_FS_File.prototype = new jsDAV_FS_Node());