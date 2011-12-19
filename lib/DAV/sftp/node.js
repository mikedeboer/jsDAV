/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_iNode = require("./../iNode").jsDAV_iNode;

var Util        = require("./../util");

function jsDAV_SFTP_Node(path, sftp) {
    this.path = (path || "").replace(/[\/]+$/, "");
    this.sftp = sftp;
}

exports.jsDAV_SFTP_Node = jsDAV_SFTP_Node;

(function() {
    /**
     * Returns the name of the node
     *
     * @return {string}
     */
    this.getName = function() {
        return Util.splitPath(this.path)[1];
    };

    /**
     * Renames the node
     *
     * @param {string} name The new name
     * @return void
     */
    this.setName = function(name, cbfssetname) {
        var parentPath = Util.splitPath(this.path)[0];
        var newName    = Util.splitPath(name)[1];

        var newPath = parentPath + "/" + newName;
        var self = this;
        this.sftp.rename(this.path, newPath, function(err) {
            if (err)
                return cbfssetname(err);
            self.path = newPath;
            cbfssetname();
        });
    };

    /**
     * Returns the last modification time, as a unix timestamp
     *
     * @return {Number}
     */
    this.getLastModified = function(cbfsgetlm) {
        if (this.$stat)
            return cbfsgetlm(null, this.$stat.mtime);
        //var self = this;
        this.sftp.stat(this.path, function(err, stat) {
            if (err || typeof stat == "undefined")
                return cbfsgetlm(err);
            //self.$stat = stat;
            cbfsgetlm(null, stat.mtime);
        });
    };

    /**
     * Returns whether a node exists or not
     *
     * @return {Boolean}
     */
    this.exists = function(cbfsexist) {
        this.sftp.stat(this.path, function(err, stat) {
            cbfsexist(Boolean(!err && stat));
        });
    };
}).call(jsDAV_SFTP_Node.prototype = new jsDAV_iNode());
