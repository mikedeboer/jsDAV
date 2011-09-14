/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV       = require("./../../jsdav");
var jsDAV_iNode = require("./../iNode").jsDAV_iNode;
var jsDav_iProperties = require("./../iProperties").jsDAV_iProperties;

var Fs          = require("fs");
var Path        = require("path");
var Util        = require("./../util");
var Exc         = require("./../exceptions");

function jsDAV_Ftp_Node(path, ftp) {
    this.path = (path || "").replace(/[\/]+$/, "");
    this.ftp = ftp;
}

exports.jsDAV_Ftp_Node = jsDAV_Ftp_Node;

(function() {
    this.implement(jsDav_iProperties);

    this.getName = function() {
        return Util.splitPath(this.path)[1];
    };

    /**
     * Renames the node
     *
     * @param {string} name The new name
     * @return void
     */
    this.setName = function(destination, cbftpsetname) {
        var self = this;
        this.ftp.rename(this.path, destination, function(err) {
            if (err)
                return cbftpsetname(err);

            self.path = destination;
            cbftpsetname();
        });
    };

    /**
     * Returns the last modification time, as a unix timestamp
     *
     * @return {Number}
     */
    this.getLastModified = function(cbftpgetlm) {
         /** Last modification date can't be figured out for root node, because there isn't one.
           * Therefore, return a future date to force update. @todo implement this properly */
         return cbftpgetlm(null, new Date().toUTCString());
    };

    this.$isRoot = function() {
        return this.hasFeature(jsDAV.__ICOLLECTION__) && this.isRoot === true;
    };

    this.exists = function(cbftpexist) {
        if (this.ftp.$cache[this.path])
            return cbftpexist(true);

        this.ftp.ls(this.path, function(err, stat) {
            cbftpexist(!err && stat.length === 1);
        });
    };
}).call(jsDAV_Ftp_Node.prototype = new jsDAV_iNode());
