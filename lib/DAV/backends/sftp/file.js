/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_SFTP_Node = require("./node");
var jsDAV_File = require("./../../file");

var Exc = require("./../../../shared/exceptions");
var Util = require("./../../../shared/util");

var jsDAV_SFTP_File = module.exports = jsDAV_SFTP_Node.extend(jsDAV_File, {
    initialize: function(path, sftp) {
        this.path = (path || "").replace(/[\/]+$/, "");
        this.sftp = sftp;
    },

    /**
     * Updates the data
     *
     * @param {mixed} data
     * @return void
     */
    put: function(data, type, cbfsput) {
        this.sftp.writeFile(this.path, data, type || "utf8", cbfsput);
    },

    /**
     * Returns the data
     *
     * @return Buffer
     */
    get: function(cbfsfileget) {
        if (this.$buffer)
            return cbfsfileget(null, this.$buffer);
        //var self  = this;
        this.sftp.readFile(this.path, null, function(err, buff) {
            if (err)
                return cbfsfileget(err);
            // Zero length buffers act funny, use a string
            if (buff.length === 0)
                buff = "";
            //self.$buffer = buff;
            cbfsfileget(null, buff);
        });
    },

    /**
     * Delete the current file
     *
     * @return void
     */
    "delete": function(cbfsfiledel) {
        this.sftp.unlink(this.path, cbfsfiledel);
    },

    /**
     * Returns the size of the node, in bytes
     *
     * @return int
     */
    getSize: function(cbfsgetsize) {
        if (this.$stat)
            return cbfsgetsize(null, this.$stat.size);
        var self = this;
        this.sftp.stat(this.path, function(err, stat) {
            if (err || !stat) {
                return cbfsgetsize(new Exc.jsDAV_Exception_FileNotFound("File at location "
                    + self.path + " not found"));
            }
            //self.$stat = stat;
            cbfsgetsize(null, stat.size);
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
        cbfsgetetag(null, null);
    },

    /**
     * Returns the mime-type for a file
     * If null is returned, we'll assume application/octet-stream
     *
     * @return mixed
     */
    getContentType: function(cbfsmime) {
        return cbfsmime(null, Util.mime.type(this.path));
    }
});
