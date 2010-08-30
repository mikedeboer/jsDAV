/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV       = require("./../jsdav"),
    jsDAV_iNode = require("./../iNode").jsDAV_iNode,

    Fs          = require("fs"),
    Path        = require("path"),
    Util        = require("./../util"),
    Exc         = require("./../exceptions");

function jsDAV_FS_Node(path) {
    this.path = path;
}

exports.jsDAV_FS_Node = jsDAV_FS_Node;

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
    this.setName = function(name, callback) {
        var parentPath = Util.splitPath(this.path)[0],
            newName    = Util.splitPath(name)[1];

        var newPath = parentPath + "/" + newName;
        var _self = this;
        Fs.rename(this.path, newPath, function(err) {
            if (err)
                callback(err);
            _self.path = newPath;
            callback();
        });
    };

    /**
     * Returns the last modification time, as a unix timestamp
     *
     * @return {Number}
     */
    this.getLastModified = function(callback) {
        if (this.$stat)
            return callback(null, this.$stat.mtime);
        var _self = this;
        Fs.stat(this.path, function(err, stat) {
            if (err || !stat)
                return callback(err);
            _self.$stat = stat;
            callback(null, stat.mtime);
        });
    };

    /**
     * Returns whether a node exists or not
     *
     * @return {Boolean}
     */
    this.exists = function(callback) {
        Path.exists(this.path, callback);
    };
}).call(jsDAV_FS_Node.prototype = new jsDAV_iNode());
