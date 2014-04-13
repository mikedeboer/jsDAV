/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_FS_File = require("./../fs/file");
var jsDAV_FSExt_Node = require("./node");

var Crypto = require("crypto");
var Fs = require("fs");
var Exc = require("./../../../shared/exceptions");
var Util = require("./../../../shared/util");

var jsDAV_FSExt_File = module.exports = jsDAV_FS_File.extend(jsDAV_FSExt_Node, {
    /**
     * Updates the data
     *
     * @param {mixed} data
     * @return void
     */
    put: function(data, type, cbfsput) {
        var self = this;
        jsDAV_FS_File.put.call(this, data, type, function(err) {
            if (err)
                return cbfsput(err);
            self.getETag(cbfsput);
        });
    },

    /**
     * Updates the data whilst writing to a stream instead of from Buffer objects
     * that reside in memory.
     *
     * @param {mixed} data
     * @return void
     */
    putStream: function(handler, type, cbfsput) {
        var self = this;
        jsDAV_FS_File.putStream.call(this, handler, type, function(err) {
            if (err)
                return cbfsput(err);
            self.getETag(cbfsput);
        });
    },

    "delete": function(cbfsfiledel) {
        var self = this;
        Fs.unlink(this.path, function(err) {
            if (err)
                cbfsfiledel(err);
            self.deleteResourceData(cbfsfiledel)
        });
    },

    /**
     * Returns the ETag for a file
     * An ETag is a unique identifier representing the current version of the file.
     * If the file changes, the ETag MUST change.
     * Return null if the ETag can not effectively be determined
     *
     * @return mixed
     */
    getETag: function(cbfsgetetag) {
        var stream = Fs.createReadStream(this.path);
        Util.createHashStream(stream, function(err, hash) {
            if (err)
                return cbfsgetetag(err);
            cbfsgetetag(null, '"' + hash + '"');
        });
    }
});
