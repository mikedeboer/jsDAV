/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_iNode = require("./../../interfaces/iNode");
var jsDAV_iProperties = require("./../../interfaces/iProperties");
var jsDAV_iCollection = require("./../../interfaces/iCollection");

var Util = require("./../../../shared/util");

var jsDAV_Ftp_Node = module.exports = jsDAV_iNode.extend(jsDAV_iProperties, {
    initialize: function(path, ftp) {
        this.path = (path || "").replace(/[\/]+$/, "");
        this.ftp = ftp;
    },

    getName: function() {
        return Util.splitPath(this.path)[1];
    },

    /**
     * Renames the node
     *
     * @param {string} name The new name
     * @return void
     */
    setName: function(destination, cbftpsetname) {
        var self = this;
        this.ftp.rename(this.path, destination, function(err) {
            if (err)
                return cbftpsetname(err);

            self.path = destination;
            cbftpsetname();
        });
    },

    /**
     * Returns the last modification time, as a unix timestamp
     *
     * @return {Number}
     */
    getLastModified: function(cbftpgetlm) {
         /** Last modification date can't be figured out for root node, because there isn't one.
           * Therefore, return a future date to force update. @todo implement this properly */
         return cbftpgetlm(null, new Date().toUTCString());
    },

    $isRoot: function() {
        return this.hasFeature(jsDAV_iCollection) && this.isRoot === true;
    },

    exists: function(cbftpexist) {
        if (this.ftp.$cache[this.path])
            return cbftpexist(true);

        this.ftp.ls(this.path, function(err, stat) {
            cbftpexist(!err && stat.length === 1);
        });
    }
});
