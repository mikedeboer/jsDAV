/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Luis Merino <luis AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV_Tree          = require("../tree").jsDAV_Tree,
    jsDAV_Ftp_Directory = require("../ftp/directory").jsDAV_Ftp_Directory,
    jsDAV_Ftp_File      = require("../ftp/file").jsDAV_Ftp_File,

    Fs                  = require("fs"),
    Ftp                 = require("../../../support/node-ftp/ftp"),
    Util                = require("../util"),
    Error               = require("../exceptions");

/**
 * jsDAV_Tree_Ftp
 *
 * Creates this tree
 * Supply the path you'd like to share among with the options for the ftp connection
 *
 * @param {String} basePath
 * @contructor
 */
function jsDAV_Tree_Ftp(options) {
    if (!options.tmpDir) {
        throw new Exc.jsDAV_Exception("Could not initialize ftp tree, tmpDir option is missing");
    }
    this.tmpDir = options.tmpDir;
    this.basePath = options.node || '';
    this.ftp = new Ftp(options.ftp);
    
    var conn = this.ftp;
    
    conn.on('connect', function() {
        conn.auth(options.ftp.user, options.ftp.pass, function(err) {
            if (err)
                throw err;
        });
    });
    
    Util.EventEmitter.DEFAULT_TIMEOUT = 10000;
    conn.connect();
}

exports.jsDAV_Tree_Ftp = jsDAV_Tree_Ftp;

(function() {
    /**
     * Returns a new node for the given path
     *
     * @param string path
     * @return void
     */
    this.getNodeForPath = function(path, next) {
        var realPath = this.getRealPath(path),
            self = this;
        this.ftp.stat(realPath, function(err, stat) {
            if (!Util.empty(err))
                return next(new Error.jsDAV_Exception_FileNotFound(err));
                
            next(null, stat.isDirectory()
                ? new jsDAV_Ftp_Directory(realPath, self.ftp)
                : new jsDAV_Ftp_File(realPath, self.ftp))
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
    this.copy = function(source, destination, next) {
        source      = this.getRealPath(source);
        destination = this.getRealPath(destination);
        this.realCopy(source, destination, next);
    };

    /**
     * Used by self::copy
     *
     * @param string source
     * @param string destination
     * @return void
     */
    this.realCopy = function(source, destination, next) {
        
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
    this.move = function(source, destination, next) {
        source      = this.getRealPath(source);
        destination = this.getRealPath(destination);
        Fs.rename(source, destination, next);
    };
}).call(jsDAV_Tree_Ftp.prototype = new jsDAV_Tree());
