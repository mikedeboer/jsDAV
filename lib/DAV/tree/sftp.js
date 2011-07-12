/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV_Tree           = require("./../tree").jsDAV_Tree,
    jsDAV_SFTP_Directory = require("./../sftp/directory").jsDAV_SFTP_Directory,
    jsDAV_SFTP_File      = require("./../sftp/file").jsDAV_SFTP_File,

    Fs                   = require("fs"),
    Sftp                 = require("./../../../support/node-ssh").sftp,
    Async                = require("./../../../support/async.js"),
    Util                 = require("./../util"),
    Exc                  = require("./../exceptions");

/**
 * jsDAV_Tree_Sftp
 *
 * Creates this tree
 * Supply the path you'd like to share.
 *
 * @param {String} basePath
 * @contructor
 */
function jsDAV_Tree_Sftp(options) {
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
}

exports.jsDAV_Tree_Sftp = jsDAV_Tree_Sftp;

(function() {
    /**
     * Disconnect from an open Sftp session to not have child processes hanging
     * around in zombie mode.
     * 
     * @return void
     */
    this.unmount = function() {
        //this.sftp.disconnect();
    };
    
    /**
     * Returns a new node for the given path
     *
     * @param string path
     * @return void
     */
    this.getNodeForPath = function(path, cbfstree) {
        var realPath = this.getRealPath(path),
            _self    = this;
        this.sftp.stat(realPath, function(err, stat) {
            if (!Util.empty(err))
                return cbfstree(new Exc.jsDAV_Exception_FileNotFound("File at location " + realPath + " not found"));
            cbfstree(null, stat.isDirectory()
                ? new jsDAV_SFTP_Directory(realPath, _self.sftp)
                : new jsDAV_SFTP_File(realPath, _self.sftp))
        });
    };

    /**
     * Returns the real filesystem path for a webdav url.
     *
     * @param string publicPath
     * @return string
     */
    this.getRealPath = function(publicPath) {
        console.log("path: ", (Util.rtrim(this.basePath, "/") + "/" + Util.trim(publicPath, "/")).replace(/[\/]+$/, ""));
        return (Util.rtrim(this.basePath, "/") + "/" + Util.trim(publicPath, "/")).replace(/[\/]+$/, "");
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
        console.log("cp -Rf '" + this.getRealPath(source) + "' '" 
            + this.getRealPath(destination) + "'");
        var child = this.sftp.spawn("cp -rf '" + this.getRealPath(source) + "' '" 
            + this.getRealPath(destination) + "'");
        var error = '';
        child.stderr.on('data', function(data){
            error += data.toString();
        });
        child.on('exit', function(){
            cbfscopy(error);
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
        this.sftp.rename(this.getRealPath(source), this.getRealPath(destination), function(err) {          
          console.log(err);
          cbfsmove(err);
        });
    };
}).call(jsDAV_Tree_Sftp.prototype = new jsDAV_Tree());
