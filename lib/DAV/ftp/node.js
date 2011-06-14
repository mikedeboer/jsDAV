/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV       = require("./../../jsdav"),
    jsDAV_iNode = require("./../iNode").jsDAV_iNode,

    Fs          = require("fs"),
    Path        = require("path"),
    Util        = require("./../util"),
    Exc         = require("./../exceptions");

function jsDAV_Ftp_Node(path, ftp) {
    this.path = (path || "").replace(/[\/]+$/, "");
    this.ftp = ftp;
}

exports.jsDAV_Ftp_Node = jsDAV_Ftp_Node;

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
        var parentPath = Util.splitPath(this.path)[0],
            newName    = Util.splitPath(name)[1];

        var newPath = parentPath + "/" + newName;
        var self = this;
        this.ftp.rename(this.path, newPath, function(err) {
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
        var self = this;
        var lastMod = this.ftp.lastMod(this.path, function(err, mod) {
            if (err)
                return cbfsgetlm(err);
            //self.$stat = stat;
            cbfsgetlm(null, mod.toString());
        });
        if(!lastMod)
            cbfsgetlm(null, null);
    };

    /**
     * Returns whether a node exists or not
     *
     * @return {Boolean}
     */
    this.exists = function(cbfsexist) {
        this.ftp.stat(this.path, function(err, stat) {
            cbfsexist(Boolean(!err && stat))
        });
    };
}).call(jsDAV_Ftp_Node.prototype = new jsDAV_iNode());
