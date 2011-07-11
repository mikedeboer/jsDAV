/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Luis Merino <luis AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV               = require("../../jsdav"),
    jsDAV_Tree          = require("../tree").jsDAV_Tree,
    jsDAV_Ftp_Directory = require("../ftp/directory").jsDAV_Ftp_Directory,
    jsDAV_Ftp_File      = require("../ftp/file").jsDAV_Ftp_File,
    
    EventEmitter        = require("events").EventEmitter,
    Fs                  = require("fs"),
    Ftp                 = require("../../../support/node-ftp/ftp"),
    Util                = require("../util"),
    Exc                 = require("../exceptions");

/**
 * jsDAV_Tree_Ftp
 *
 * Creates this tree
 * Supply the path you'd like to share among with the options for the ftp connection
 *
 * @param {Object} options
 * @contructor
 */

Ftp.debugMode = require("../../jsdav").debugMode;
 
function jsDAV_Tree_Ftp(options) {
    this.basePath = options.node || "";
    this.options = options.ftp;
    this.setup();
}

exports.jsDAV_Tree_Ftp = jsDAV_Tree_Ftp;

(function() {
    
    this.setup = function() {
        this.ftp = new Ftp(this.options);
        this.ftp.$cache = {};
    };
    
    /**
     * This function is called from jsDAV_Ftp_Plugin as part of the initialization of the jsDav Tree.
     * It aims to prepare FTP for the IDE; the next steps are taken:
     *
     *  - Connects using specified host and port.
     *  - Auths the user with the specified username and password.
     *  - Determines the current working directory at the beginning of this connection.
     *  - Sends IDLE to update the idle timeout of the server if available, or defaults to 1 min otherwise
     *  - Stores a temp file under the initial path of the project. If Ftp refuses operations for the user,
     *    event "error" is emitted, if user lacks write permissions the state will be considered good anyways,
     *    and event "ftp.ready will be emitted; this will stab the callback execution.
     *  - Tries to execute MDTM to determine the lastMod of this temp file and stores it as a
     *    GMTDate (Date object). If this command is not implemented in the FTP server, this will stab the
     *    callback execution and delete the temp file.
     *  - Run stat (LIST) using the temp file path to determine is lastMod, usually returning the local date
     *    of the FTP server, which its used to foresee the timezone difference in hours. If this command fails
     *    there's something terribly wrong and this will stab the callback execution and delete the temp file.
     *  - The hour difference will be saved in the FTP instance for future reckoning and the "ftp.ready" event
     *    will be emitted finalising the process.
     */
    this.initialize = function() {
        var conn = this.ftp,
            user = this.options.user,
            pass = this.options.pass,
            tmpFile, _self = this;
        
        conn.once("connect", function() {
            conn.auth(user, pass, function(err) {
                if (err)
                    return conn.emit("ftp.error", err);
                conn.pwd(function(err, workingDir) {
                    if (err)
                        return conn.emit("ftp.error", err);
                    /** Preparing basePath for all ftp commands */
                    _self.basePath = Util.rtrim(workingDir, "/") + "/" + Util.trim(_self.basePath, "/");
                    /** Augment idle seconds of the server to 900 */
                    var idleSeconds = 900;
                    conn.idle(idleSeconds, function() { // Attemps to change the idle seconds of the server connection, gracefully
                        tmpFile = _self.getRealPath("io.c9.tmp");
                        conn.put(new Buffer("Cloud9 FTP connection test."), tmpFile, function(err) {
                            if (err) {
                                if (err.code == 550) // Server possibly throwed "Access is denied"...?
                                    return conn.emit("error", err);
                                else
                                    return conn.emit("ftp.ready");
                            }
                            conn.lastMod(tmpFile, function(err, date) {
                                if (err) {
                                    return deleteTempFile(function() {
                                        conn.emit("ftp.ready");
                                    });
                                }
                                var GMTDate = date;
                                conn.stat(tmpFile, function(err, stat) {
                                    if (err) {
                                        return deleteTempFile(function() {
                                            conn.emit("error", err);
                                        });
                                    }
                                    var localDate = stat.getLastMod();
                                    // Both dates were retrieved as GMT +0000 to make the comparison.
                                    var timeDiff = localDate.getUTCHours() - GMTDate.getUTCHours();
                                    // Save FTP server LIST cmd difference in hours.
                                    conn.TZHourDiff = timeDiff + 1;
                                    deleteTempFile(function() {
                                        conn.emit("ftp.ready");
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
        
        conn.once("timeout", onServerFailed);
        conn.once("error", onServerFailed);
        
        /** Failsafe connection start */
        try {
            conn.connect();
        } catch(e) {
            onServerFailed(e.message);
        }
        
        function deleteTempFile(next) {
            conn["delete"](tmpFile, function(err) {
                if (err)
                    conn.emit("ftp.error", err);
                next();
            });
        }
        
        /**
         * Any errors on the FTP server will end the connection, and try to reconnect after 5 seconds.
         * This prevents connections hanging if an error is to occur.
         */
        function onServerFailed(err) {
            conn.emit("ftp.error", (err ? err.message : err) + " \n\rConnection retry in 5 secs ...");
            conn.end();
            setTimeout(function(){
                conn.connect();
            }, 5000);
        }
    };
    
    /**
     * Returns a new node for the given path
     *
     * @param {String} path
     * @return void
     */
    this.getNodeForPath = function(path, next) {
        var realPath = this.getRealPath(path);
        var conn = this.ftp;
        
        if (conn.$cache[realPath])
            return next(null, conn.$cache[realPath]);
        
        /** Root node requires special treatment because it will not be listed */
        if (realPath == this.basePath) {
            var baseDir = new jsDAV_Ftp_Directory(realPath = Util.rtrim(realPath, "/"), conn);
            baseDir.isRoot = true;
            return next(null, conn.$cache[realPath] = baseDir);
        }
        
        this.ftp.stat(realPath, function(err, stat) {
            if (!Util.empty(err))
                return next(new Exc.jsDAV_Exception_FileNotFound(err));
            
            if (stat.isDirectory())
                conn.$cache[realPath] = new jsDAV_Ftp_Directory(realPath, conn);
            else
                conn.$cache[realPath] = new jsDAV_Ftp_File(realPath, conn);
            
            // Hack for seconds since FTP "ls" doesn't return them.
            stat.time.second = new Date().getSeconds();
            conn.$cache[realPath].$stat = stat;
            next(null, conn.$cache[realPath]);
        });
    };

    /**
     * Returns the real filesystem path for a webdav url.
     *
     * @param {String} publicPath
     * @return {String}
     */
    this.getRealPath = function(publicPath) {
        var realPath = Util.rtrim(this.basePath, "/") + "/" + Util.trim(publicPath, "/");
        return realPath;
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
        var source      = this.getRealPath(source);
        var destination = this.getRealPath(destination);
        next(new Exc.jsDAV_Exception_NotImplemented("Could not copy from " + source + " to "
        + destination + ". COPY/DUPLICATE not implemented."));
    };

    /**
     * Moves a file or directory recursively.
     * In case the ide crashed, the nodes cache was cleared and the source's parent will have to be pre-cached
     * and so will have its children using $getParentNodeRecall(), this way we will be able to come back to this method
     * to rename the source effectively.
     * Once the MOVE has been executed, the node need's to be updated in the cache, and if it's a Directory type its
     * children will have to be updated in the cache as well, so the new keys correspond to the new path.
     *
     * If the destination exists, delete it first.
     *
     * @param string source
     * @param string destination
     * @return void
     */
    this.move = function(source, destination, next) {
        var source      = this.getRealPath(source);
        var destination = this.getRealPath(destination);
        var node        = this.ftp.$cache[source];
        var _self = this;
        
        if (!node) // This should only happen if the server crashed.
            return this.$getParentNodeRecall(source);
        
        node.setName(destination, function(err){
            if (err)
                return next(err);
            
            _self.ftp.$cache[destination] = node;
            delete _self.ftp.$cache[source];
            if (node.hasFeature(jsDAV.__ICOLLECTION__)) {
                repathChildren.call(_self, source, destination);
            }
            next();
        });
        
        function repathChildren(oldParentPath, newParentPath) {
            var paths = Object.keys(this.ftp.$cache);
            var re = new RegExp("^" + oldParentPath.replace(/\//g, "\\/") + ".+$");
            var path, node;
            
            for (var k in paths) {
                path = paths[k];
                if (re.test(path)) {
                    node = this.ftp.$cache[path];
                    delete this.ftp.$cache[path];
                    path = newParentPath + path.substring(oldParentPath.length);
                    node.path = path;
                    this.ftp.$cache[path] = node;
                }
            }
        }
    };
    
    /**
     * Caches a path's parent path and its children, then calls back to the caller function with the
     * previous arguments.
     *
     * @param string path
     * @return void
     */
    this.$getParentNodeRecall = function(path) {
        var caller = arguments.callee.caller;
        var callerArgs = caller.arguments;
        var next = callback = callerArgs[callerArgs.length-1];
        var parentPath = Util.splitPath(path)[0];
        var _self = this;
        
        this.getNodeForPath(parentPath.substring(this.basePath.length), function(err, node) {
            if (err)
                return next(err);
            
            node.getChildren(function(err, nodes) {
                if (err)
                    return next(err);
                
                if (nodes.length && typeof caller === 'function') {
                    nodes.forEach(function(child) {
                        if (child.path === path)
                            callback = caller.bind.apply(caller, [_self].concat([].slice.call(callerArgs)));
                    });
                    callback();
                } else
                    next();
            });
        });
    };
    
    this.unmount = function() {
        console.info("\r\nClosed connection to the server. Unmounting FTP tree.");
        this.ftp.end();
    };
}).call(jsDAV_Tree_Ftp.prototype = new jsDAV_Tree());
