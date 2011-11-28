/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Kevin Smith
 * @author Kevin Smith <@respectTheCode>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV = require("./../../jsdav");
var jsDAV_Handler_Node = require("./node").jsDAV_Handler_Node;
var jsDAV_Directory = require("./../directory").jsDAV_Directory;
var jsDAV_iFile = require("./../iFile").jsDAV_iFile;

var Fs = require("fs");
var Exc = require("./../exceptions");
var Util = require("./../util");

function jsDAV_Handler_File(eventHandler, path) {
    this.eventHandler = eventHandler;
    this.path = path;
}

exports.jsDAV_Handler_File = jsDAV_Handler_File;

(function() {
    this.implement(jsDAV_iFile);

    /**
     * Updates the data
     *
     * @param {mixed} data
     * @return void
     */
    this.put = function(data, enc, cbfsput) {
		this.eventHandler.putFile(this.path, data, cbfsput);
    };

    /**
     * Returns the data
     *
     * @return Buffer
     */
    this.get = function(cbfsfileget) {
		this.eventHandler.getFile(this.path, cbfsfileget);
    };

    /**
     * Delete the current file
     *
     * @return void
     */
    this["delete"] = function(cbfsfiledel) {
		this.eventHandler.deleteFile(this.path, cbfsfiledel);
    };

    /**
     * Returns the size of the node, in bytes
     *
     * @return int
     */
    this.getSize = function(cbfsgetsize) {
		this.eventHandler.getFileSize(this.path, cbfsgetsize);
    };

    /**
     * Returns the ETag for a file
     * An ETag is a unique identifier representing the current version of the file.
     * If the file changes, the ETag MUST change.
     * Return null if the ETag can not effectively be determined
     *
     * @return mixed
     */
    this.getETag = function(cbfsgetetag) {
        cbfsgetetag(null, null);
    };

    /**
     * Returns the mime-type for a file
     * If null is returned, we'll assume application/octet-stream
     *
     * @return mixed
     */
    this.getContentType = function(cbfsmime) {
        return cbfsmime(null, Util.mime.type(this.path));
    };
}).call(jsDAV_Handler_File.prototype = new jsDAV_Handler_Node());
