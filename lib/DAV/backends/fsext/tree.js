/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_FS_Tree = require("./../fs/tree");
var jsDAV_FSExt_File = require("./file");
var jsDAV_FSExt_Directory = require("./directory");

var Fs = require("fs");
var Exc = require("./../../../shared/exceptions");
var Util = require("./../../../shared/util");

var jsDAV_FSExt_Tree = module.exports = jsDAV_FS_Tree.extend({
    /**
     * Returns a new node for the given path
     *
     * @param {String} path
     * @return void
     */
    getNodeForPath: function(path, cbfstree) {
        var realPath = this.getRealPath(path);
        var nicePath = this.stripSandbox(realPath);
        if (!this.insideSandbox(realPath))
            return cbfstree(new Exc.Forbidden("You are not allowed to access " + nicePath));

        Fs.stat(realPath, function(err, stat) {
            if (!Util.empty(err))
                return cbfstree(new Exc.FileNotFound("File at location " + nicePath + " not found"));
            cbfstree(null, stat.isDirectory()
                ? jsDAV_FSExt_Directory.new(realPath)
                : jsDAV_FSExt_File.new(realPath))
        });
    },

    /**
     * Moves a file or directory recursively.
     *
     * If the destination exists, delete it first.
     *
     * @param {String} source
     * @param {String} destination
     * @return void
     */
    move: function(source, destination, cbfsmove) {
        source      = this.getRealPath(source);
        destination = this.getRealPath(destination);
        if (!this.insideSandbox(destination)) {
            return cbfsmove(new Exc.Forbidden("You are not allowed to move to " +
                this.stripSandbox(destination)));
        }

        Fs.stat(source, function(err, stat) {
            if (!Util.empty(err))
                return cbfsmove(new Exc.FileNotFound("File at location " + source + " not found"));

            var isDir = stat.isDirectory();
            var node = isDir
                ? jsDAV_FSExt_Directory.new(source)
                : jsDAV_FSExt_File.new(source);
            node.getResourceData(function(err, data) {
                if (err)
                    return cbfsmove(err, source, destination);

                Fs.rename(source, destination, function(err) {
                    if (err)
                        return cbfsmove(err, source, destination);

                    node = isDir
                        ? jsDAV_FSExt_Directory.new(destination)
                        : jsDAV_FSExt_File.new(destination);
                    node.putResourceData(data, function(err) {
                        cbfsmove(err, source, destination);
                    });
                });
            });
        });
    }
});
