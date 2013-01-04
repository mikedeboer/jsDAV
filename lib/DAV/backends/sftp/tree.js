/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_Tree = require("./../tree");
var jsDAV_SFTP_Directory = require("./directory");
var jsDAV_SFTP_File = require("./file");

var Sftp = require("node-ssh").sftp;
var Util = require("./../../../shared/util");
var Exc = require("./../../../shared/exceptions");

/**
 * jsDAV_Tree_Sftp
 *
 * Creates this tree
 * Supply the path you'd like to share.
 *
 * @param {String} basePath
 * @contructor
 */
var jsDAV_Tree_Sftp = module.exports = jsDAV_Tree.extend({
    initialize: function(options) {
        this.basePath = (options.sftp && options.sftp.home) || "";
        this.sftp = new Sftp();
        var self = this;
        this.timeout = 0;
        this.sftp.init(options.sftp, function(err) {
            // throw it anyway, because it's fatal...
            if (err)
                throw err;
            self.sftp.connect(function(err){
                if (err)
                    throw err;
            });
        });
        Util.EventEmitter.DEFAULT_TIMEOUT = 10000;
    },

    /**
     * Disconnect from an open Sftp session to not have child processes hanging
     * around in zombie mode.
     *
     * @return void
     */
    unmount: function() {
        //this.sftp.disconnect();
    },

    /**
     * Returns a new node for the given path
     *
     * @param string path
     * @return void
     */
    getNodeForPath: function(path, cbfstree) {
        var realPath = this.getRealPath(path);
        var self     = this;
        this.sftp.stat(realPath, function(err, stat) {
            if (!Util.empty(err))
                return cbfstree(new Exc.jsDAV_Exception_FileNotFound("File at location " + realPath + " not found"));
            cbfstree(null, stat.isDirectory()
                ? new jsDAV_SFTP_Directory(realPath, self.sftp)
                : new jsDAV_SFTP_File(realPath, self.sftp))
        });
    },

    /**
     * Returns the real filesystem path for a webdav url.
     *
     * @param string publicPath
     * @return string
     */
    getRealPath: function(publicPath) {
        Util.log("path: ", (Util.rtrim(this.basePath, "/") + "/" + Util.trim(publicPath, "/")).replace(/[\/]+$/, ""));
        return (Util.rtrim(this.basePath, "/") + "/" + Util.trim(publicPath, "/")).replace(/[\/]+$/, "");
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
        Util.log("cp -Rf '" + this.getRealPath(source) + "' '"
            + this.getRealPath(destination) + "'");
        var child = this.sftp.spawn("cp -rf '" + this.getRealPath(source) + "' '"
            + this.getRealPath(destination) + "'");
        var error = '';
        child.stderr.on("data", function(data){
            error += data.toString();
        });
        child.on("exit", function(){
            cbfscopy(error);
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
        this.sftp.rename(this.getRealPath(source), this.getRealPath(destination), function(err) {
          Util.log(err, "error");
          cbfsmove(err);
        });
    }
});
