/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_Tree         = require("./../tree").jsDAV_Tree;
var jsDAV_FS_Directory = require("./../fs/directory").jsDAV_FS_Directory;
var jsDAV_FS_File      = require("./../fs/file").jsDAV_FS_File;

var Fs                 = require("fs");
var Async              = require("asyncjs");
var Util               = require("./../util");
var Exc                = require("./../exceptions");

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
    this.getNodeForPath = function(path, cbfstree) {
        var realPath = this.getRealPath(path);
        var nicePath = this.stripSandbox(realPath);
        if (!this.insideSandbox(realPath))
            return cbfstree(new Exc.jsDAV_Exception_Forbidden("You are not allowed to access " + nicePath));

        Fs.stat(realPath, function(err, stat) {
            if (!Util.empty(err))
                return cbfstree(new Exc.jsDAV_Exception_FileNotFound("File at location " + nicePath + " not found"));
            cbfstree(null, stat.isDirectory()
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
    this.copy = function(source, destination, cbfscopy) {
        source      = this.getRealPath(source);
        destination = this.getRealPath(destination);
        this.realCopy(source, destination, cbfscopy);
    };

    /**
     * Used by self::copy
     *
     * @param string source
     * @param string destination
     * @return void
     */
    this.realCopy = function(source, destination, cbfsrcopy) {
        if (!this.insideSandbox(destination)) {
            return cbfsrcopy(new Exc.jsDAV_Exception_Forbidden("You are not allowed to copy to " +
                this.stripSandbox(destination)));
        }

        Fs.stat(source, function(err, stat) {
            if (!Util.empty(err))
                return cbfsrcopy(err);
            if (stat.isFile())
                Async.copyfile(source, destination, true, cbfsrcopy);
            else
                Async.copytree(source, destination, cbfsrcopy);
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
    this.move = function(source, destination, cbfsmove) {
        source      = this.getRealPath(source);
        destination = this.getRealPath(destination);
        if (!this.insideSandbox(destination)) {
            return cbfsmove(new Exc.jsDAV_Exception_Forbidden("You are not allowed to move to " +
                this.stripSandbox(destination)));
        }
        Fs.rename(source, destination, cbfsmove);
    };
}).call(jsDAV_Tree_Filesystem.prototype = new jsDAV_Tree());
