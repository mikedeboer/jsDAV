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
 * @param {String} basePath
 * @contructor
 */

Ftp.debugMode = require("../../jsdav").debugMode;
 
function jsDAV_Tree_Ftp(options) {
    this.basePath = options.node || "";
    this.options = options.ftp;
    this.ftp = new Ftp(options.ftp);
    this.ftp.$cache = {};
}

exports.jsDAV_Tree_Ftp = jsDAV_Tree_Ftp;

(function() {
    
    // Called by jsDAV_Ftp_Plugin.
    this.initialize = function() {
        var conn = this.ftp,
            user = this.options.user,
            pass = this.options.pass,
            self = this;
        
        var tmpFile = this.getRealPath("io.c9.tmp");
        conn.addListener("connect", function() {
            conn.auth(user, pass, function(err) {
                if (err)
                    return conn.emit("ftp.error", err);
                var idleSeconds = 900;
                conn.idle(idleSeconds, function() { // Attemps to change the idle seconds of the server connection, gracefully
                    conn.put(new Buffer("Cloud9 FTP connection test."), tmpFile, function(err) {
                        if (err)
                            return conn.emit("ftp.ready");
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
                                        conn.emit("ftp.ready");
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
        
        function deleteTempFile(next) {
            conn["delete"](tmpFile, function(err) {
                if (err)
                    conn.emit("ftp.error", err);
                next();
            });
        }
        conn.on("timeout", onServerFailed);
        conn.on("error", onServerFailed);
        
        // Failsafe connection try.
        try {
            conn.connect();
        } catch(e) {
            onServerFailed(e.message);
        }
        
        function onServerFailed(err) {
            conn.emit("ftp.error", err);
        }
    };
    
    /**
     * Returns a new node for the given path
     *
     * @param string path
     * @return void
     */
    this.getNodeForPath = function(path, next) {
        var self = this;
        var realPath = this.getRealPath(path);
        var conn = this.ftp;
        
        if (conn.$cache[realPath])
            return next(null, conn.$cache[realPath]);
        
        // Root node requires special treatment because it will not be listed.
        if (realPath == "/" || realPath == "")
            return next(null, conn.$cache["/"] = new jsDAV_Ftp_Directory("", conn));
        
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
     * @param string publicPath
     * @return string
     */
    this.getRealPath = function(publicPath) {
        var realPath = Util.rtrim(this.basePath, "/") + "/" + Util.trim(publicPath, "/");
        if (realPath != "/" && Util.rtrim(this.basePath, "/") == Util.rtrim(realPath, "/"))
            realPath = Util.rtrim(realPath, "/");
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
            repathChildren.call(_self, source, destination);
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
