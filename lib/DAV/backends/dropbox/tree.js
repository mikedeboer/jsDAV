/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_Tree = require("./../../tree");
var jsDAV_Dropbox_Directory = require("./directory");
var jsDAV_Dropbox_File = require("./file");

var Util = require("./../../../shared/util");
var Exc = require("./../../../shared/exceptions");

var Dbox = require("dbox");

function isError(statusCode) {
    return (statusCode >= 400 && statusCode < 600 || statusCode < 10);
}

/**
 * jsDAV_Tree_Dropbox
 *
 * Creates this tree
 * Supply the path you'd like to share.
 *
 * @param {String} basePath
 * @contructor
 */
var jsDAV_Tree_Dropbox = module.exports =  jsDAV_Tree.extend({
    initialize: function(options) {
        this.options = options;
        this.basePath = options.path || "/";
        var app = Dbox.app({
            app_key: options.app_key,
            app_secret: options.app_secret
        });
        this.client = app.client(options.access_token);
        // make sure the isError function is also available to other part of the code
        this.client.isError = isError;
    },

    /**
     * Returns a new node for the given path
     *
     * @param string path
     * @return void
     */
    getNodeForPath: function(path, cbfstree) {
        var realPath = this.getRealPath(path);
        var nicePath = this.stripSandbox(realPath);
        if (!this.insideSandbox(realPath))
            return cbfstree(new Exc.jsDAV_Exception_Forbidden("You are not allowed to access " + nicePath));

        var self = this;
        this.client.metadata(realPath, function(status, stat) {
            //console.log("RECEIVED::",status,stat);
            if (isError(status))
                return cbfstree(new Exc.jsDAV_Exception_FileNotFound("File at location " + nicePath + " not found"));
            cbfstree(null, stat.is_dir
                ? new jsDAV_Dropbox_Directory(realPath, self.client)
                : new jsDAV_Dropbox_File(realPath, self.client)
            );
        });
    },

    /**
     * Returns the real filesystem path for a webdav url.
     *
     * @param string publicPath
     * @return string
     */
    getRealPath: function(publicPath) {
        return Util.rtrim(this.basePath, "/") + "/" + Util.trim(publicPath, "/");
    },

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
    copy: function(source, destination, cbfscopy) {
        source      = this.getRealPath(source);
        destination = this.getRealPath(destination);

        if (!this.insideSandbox(destination)) {
            return cbfscopy(new Exc.jsDAV_Exception_Forbidden("You are not allowed to copy to " +
                this.stripSandbox(destination)));
        }

        this.client.cp(source, destination, function(status, res) {
            if (isError(status))
                return cbfscopy(res.error);
            cbfscopy();
        });
    },

    /**
     * Moves a file or directory recursively.
     *
     * If the destination exists, delete it first.
     *
     * @param string source
     * @param string destination
     * @return void
     */
    move: function(source, destination, cbfsmove) {
        source      = this.getRealPath(source);
        destination = this.getRealPath(destination);
        if (!this.insideSandbox(destination)) {
            return cbfsmove(new Exc.jsDAV_Exception_Forbidden("You are not allowed to move to " +
                this.stripSandbox(destination)));
        }
        this.client.mv(source, destination, function(status, res) {
            if (isError(status))
                return cbfsmove(res.error);
            cbfsmove();
        });
    },
});
