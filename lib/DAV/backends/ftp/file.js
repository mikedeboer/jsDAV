/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_Ftp_Node = require("./node");
var jsDAV_File = require("./../../file");

var Path = require("path");
var Exc = require("./../../../shared/exceptions");
var Util = require("./../../../shared/util");

var jsDAV_Ftp_File = module.exports = jsDAV_Ftp_Node.extend(jsDAV_File, {
    initialize: function(path, ftp) {
        this.path = path || "";
        this.ftp = ftp;
    },

    /**
     * Creates or updates the data of this node
     *
     * @param {mixed} data
     * @return void
     */
    put: function(data, type, cbftpput) {
        var path = this.path;
        var ftp  = this.ftp;
        var cached = ftp.$cache[path];

        if (cached && cached.$stat && cached.$stat.target)
            path = Path.resolve(Path.dirname(path), cached.$stat.target);

        if (!Buffer.isBuffer(data))
            data = new Buffer(data, type || "binary");

        ftp.put(path, data, function(err) {
            if (err)
                return cbftpput(err);
            // @todo what about parent node's cache??
            delete ftp.$cache[path];
            cbftpput();
        });
    },

    /**
     * Returns the data
     *
     * @return Buffer
     */
    get: function(cbftpfileget) {
        var path = this.path;
        var cached = this.ftp.$cache[path];

        if (cached && cached.$stat && cached.$stat.target)
            path = Path.resolve(Path.dirname(path), cached.$stat.target);

        this.ftp.get(path, function(err, data) {
            cbftpfileget(err, data);
        });
    },

    /**
     * Delete the current file
     *
     * @return void
     */
    "delete": function(cbftpfiledel) {
        var self = this;
        var path = this.path;
        this.ftp.raw.dele(path, function(err){
            if (err)
                return cbftpfiledel(new Exc.jsDAV_Exception_FileNotFound(
                        "File " + path + " not found"));

            delete self.ftp.$cache[path];
            cbftpfiledel();
        });
    },

    /**
     * Returns the size of the node, in bytes
     *
     * @return int
     */
    getSize: function(cbftpgetsize) {
        var path = this.path;
        var cached = this.ftp.$cache[path];

        if (cached && cached.$stat) {
            if (cached.$stat.target)
                path = Path.resolve(Path.dirname(path), cached.$stat.target);

            cbftpgetsize(null, cached.$stat.size);
        }
        else {
            cbftpgetsize("The file '"+ path + "' was not cached and its information couldn't be determined");
        }
    },

    /**
     * Returns the ETag for a file
     * An ETag is a unique identifier representing the current version of the file.
     * If the file changes, the ETag MUST change.
     * Return null if the ETag can not effectively be determined
     *
     * @return mixed
     */
    getETag: function(cbftpgetetag) {
        cbftpgetetag(null, null);
    },

    /**
     * Returns the mime-type for a file
     * If null is returned, we'll assume application/octet-stream
     *
     * @return mixed
     */
    getContentType: function(cbftpmime) {
        return cbftpmime(null, Util.mime.type(this.path));
    }
});
