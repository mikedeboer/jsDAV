/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV_Tree         = require("./../tree").jsDAV_Tree,
    jsDAV_FS_Directory = require("./../fs/directory").jsDAV_FS_Directory,
    jsDAV_FS_File      = require("./../fs/file").jsDAV_FS_File,

    Util               = require("./../util"),
    Exc                = require("./../exceptions");

/**
 * jsDAV_Tree_Filesystem
 *
 * Creates this tree
 * Supply the path you'd like to share.
 *
 * @param {String} basePath
 * @contructor
 */
function jsDAV_Tree_Filesystem(basePath) {
    this.basePath = basePath;
}

exports.jsDAV_Tree_Filesystem = jsDAV_Tree_Filesystem;

(function() {
    /**
     * Returns a new node for the given path
     *
     * @param string path
     * @return void
     */
    this.getNodeForPath = function(path) {
        var realPath = this.getRealPath(path);
        Fs.stat(realPath, function(err, stat) {
            if (err || !stat)
                callback(new Exc.jsDAV_Exception_FileNotFound("File at location " + realPath + " not found"));
            callback(null, stat.isDirectory()
                ? new jsDAV_FS_Directory(realPath)
                : new jsDAV_FS_File(realPath))
        });
    };

    /**
     * Returns the real filesystem path for a webdav url.
     *
     * @param string publicPath
     * @return string
     */
    this.getRealPath = function(publicPath) {
        return Util.rtrim(this.basePath, "/") + "/" + Util.trim(publicPath, "/");
    };

    /**
     * Copies a file or directory.
     *
     * This method must work recursively and delete the destination
     * if it exists
     *
     * @param string source
     * @param string destination
     * @return void
     */
    this.copy = function(source, destination, callback) {
        source      = this.getRealPath(source);
        destination = this.getRealPath(destination);
        this.realCopy(source, destination, callback);
    };

    /**
     * Used by self::copy
     *
     * @param string source
     * @param string destination
     * @return void
     */
    this.realCopy = function(source, destination, callback) {
        Fs.stat(source, function(err, stat) {
            if (err || !stat)
                callback(stat);
            if (stat.isFile())
                Async.copyfile(source, destination, true, callback);
            else
                Async.copytree(source, destination, callback);
        });
    };

    /**
     * Moves a file or directory recursively.
     *
     * If the destination exists, delete it first.
     *
     * @param string source
     * @param string destination
     * @return void
     */
    this.move = function(source, destination, callback) {
        source      = this.getRealPath(source);
        destination = this.getRealPath(destination);
        Fs.rename(source, destination, callback);
    };
}).call(jsDAV_Tree_Filesystem.prototype = new jsDAV_Tree());