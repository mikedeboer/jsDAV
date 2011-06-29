/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV           = require("./../../jsdav"),
    jsDAV_Ftp_Node = require("./node").jsDAV_Ftp_Node,
    jsDAV_Directory = require("./../directory").jsDAV_Directory,
    jsDAV_iFile     = require("./../iFile").jsDAV_iFile,

    Fs              = require("fs"),
    Exc             = require("./../exceptions"),
    Util            = require("./../util");

function jsDAV_Ftp_File(path, ftp) {
    this.path = (path || "").replace(/[\/]+$/, "");
    this.ftp = ftp;
}

exports.jsDAV_Ftp_File = jsDAV_Ftp_File;

(function() {
    this.implement(jsDAV_iFile);

    /**
     * Creates or updates the data of this node
     *
     * @param {mixed} data
     * @return void
     */
    this.put = function(data, type, cbftpput) {
        var buffer = (!Buffer.isBuffer(data))
            ? new Buffer(data, type || "binary")
            : data;
        var self = this;

        this.ftp.put(buffer, this.path, function(err) {
            if (err)
                return cbftpput(err);
            // @todo what about parent node's cache??
            delete self.ftp.$cache[self.path];
            cbftpput();
        });
    };

    /**
     * Returns the data
     *
     * @return Buffer
     */
    this.get = function(cbftpfileget) {
        this.ftp.get(this.path, function(err, data) {
            cbftpfileget(err, data && data.toString("utf8"));
        });
    };

    /**
     * Delete the current file
     *
     * @return void
     */
    this["delete"] = function(cbftpfiledel) {
        var self = this;
        this.ftp["delete"](this.path, function(err){
            if (err)
                return cbftpfiledel(new Exc.jsDAV_Exception_FileNotFound("File at location " 
                    + self.path + " not found"));
            
            delete self.ftp.$cache[self.path];
            cbftpfiledel();
        });
    };

    /**
     * Returns the size of the node, in bytes
     *
     * @return int
     */
    this.getSize = function(cbftpgetsize) {
        var bytes = this.ftp.$cache[this.path].$stat.size;
        cbftpgetsize(bytes);
    };

    /**
     * Returns the ETag for a file
     * An ETag is a unique identifier representing the current version of the file.
     * If the file changes, the ETag MUST change.
     * Return null if the ETag can not effectively be determined
     *
     * @return mixed
     */
    this.getETag = function(cbftpgetetag) {
        cbftpgetetag(null, null);
    };

    /**
     * Returns the mime-type for a file
     * If null is returned, we'll assume application/octet-stream
     *
     * @return mixed
     */
    this.getContentType = function(cbftpmime) {
        return cbftpmime(null, Util.mime.type(this.path));
    };
}).call(jsDAV_Ftp_File.prototype = new jsDAV_Ftp_Node());
