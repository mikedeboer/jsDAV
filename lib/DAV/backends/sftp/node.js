/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_iNode = require("./../../interfaces/iNode");

var Util = require("./../../../shared/util");

var jsDAV_SFTP_Node = module.exports = jsDAV_iNode.extend({
    initialize: function(path, sftp) {
        this.path = (path || "").replace(/[\/]+$/, "");
        this.sftp = sftp;
    },

    /**
     * Returns the name of the node
     *
     * @return {string}
     */
    getName: function() {
        return Util.splitPath(this.path)[1];
    },

    /**
     * Renames the node
     *
     * @param {string} name The new name
     * @return void
     */
    setName: function(name, cbfssetname) {
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
    },

    /**
     * Returns the last modification time, as a unix timestamp
     *
     * @return {Number}
     */
    getLastModified: function(cbfsgetlm) {
        if (this.$stat)
            return cbfsgetlm(null, this.$stat.mtime);
        //var self = this;
        this.sftp.stat(this.path, function(err, stat) {
            if (err || typeof stat == "undefined")
                return cbfsgetlm(err);
            //self.$stat = stat;
            cbfsgetlm(null, stat.mtime);
        });
    },

    /**
     * Returns whether a node exists or not
     *
     * @return {Boolean}
     */
    exists: function(cbfsexist) {
        this.sftp.stat(this.path, function(err, stat) {
            cbfsexist(Boolean(!err && stat));
        });
    }
});
