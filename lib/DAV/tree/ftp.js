/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Luis Merino <luis AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV               = require("../../jsdav");
var jsDAV_Tree          = require("../tree").jsDAV_Tree;
var jsDAV_Ftp_Directory = require("../ftp/directory").jsDAV_Ftp_Directory;
var jsDAV_Ftp_File      = require("../ftp/file").jsDAV_Ftp_File;

var Ftp                 = require("../../../support/jsftp/jsftp");
var Util                = require("../util");
var Exc                 = require("../exceptions");
var Path                = require('path');

var PWD_RE = /.*"(.*)".*/;

/**
 * jsDAV_Tree_Ftp
 *
 * Creates the FTP tree.
 *
 * @param {Object} options
 * @contructor
 */

Ftp.debugMode = require("../../jsdav").debugMode;

function jsDAV_Tree_Ftp(options) {
    this.options  = options.ftp;
    this.basePath = this.options.path || "./";
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
     *    and event – ftp.ready will be emitted; this will stab the callback execution.
     *  - Tries to execute MDTM to determine the lastMod of this temp file and stores it as a
     *    GMTDate (Date object). If this command is not implemented in the FTP server, this will stab the
     *    callback execution and delete the temp file.
     *  - Run stat (LIST) using the temp file path to determine is lastMod, usually returning the local date
     *    of the FTP server, which its used to foresee the timezone difference in hours. If this command fails
     *    there's something terribly wrong and this will stab the callback execution and delete the temp file.
     *  - The hour difference will be saved in the FTP instance for future reckoning and the "ftp.ready" event
     *    will be emitted finalising the process.
     */
    this.initialize = function(onReady, onError) {
        var ftp  = this.ftp;
        var self = this;

        if (ftp.authenticated)
            return onReady();

        var getBasePath = function(callback) {
            ftp.raw.pwd(function(err, info) {
                if (err)
                    return onError(err);

                var currentPath = PWD_RE.exec(info.text);
                if (currentPath && currentPath[1])
                    self.basePath = currentPath[1];

                callback();
            });
        }

        if (ftp.connected)
            ftp.auth(this.options.user, this.options.pass, function(err, data) {
                if (err)
                    return onError(err);

                getBasePath(onReady)
            });
        else
            getBasePath(onReady)
    };

    /**
     * Returns a new node for the given path
     *
     * @param {String} path
     * @return void
     */
    this.getNodeForPath = function(path, next) {
        var ftp = this.ftp;
        var self = this;
        //path = this.getRealPath(path);

        if (path == "" || path == " " || path == "/")
            path = this.basePath;

        if (ftp.$cache[path])
            return next(null, ftp.$cache[path]);

        // Root node requires special treatment because it will not be listed
        if (path === this.basePath) {
            var baseDir = new jsDAV_Ftp_Directory(path, ftp);
            baseDir.isRoot = true;
            return next(null, ftp.$cache[path] = baseDir);
        }

        var baseName = Path.basename(path).replace("/", "");
        ftp.ls(Path.dirname(path), function(err, res) {
            if (err) {
                if (res.code === 530) // Not logged in
                    ftp.auth(self.options.user, self.options.pass, function(err, res) {
                        if (!err)
                            self.getNodeForPath(path, next);
                        else
                            console.log(err);
                    });
                else
                    return next(new Exc.jsDAV_Exception_FileNotFound(err));
            }
            else {
                var file;
                for (var i = 0; i < res.length; i++) {
                    var stat = res[i];

                    if (stat.name === baseName) {
                        file = stat;
                        break;
                    }
                }

                if (file) {
                    if (file.type === 1) // Is it a directory?
                        ftp.$cache[path] = new jsDAV_Ftp_Directory(path, ftp);
                    else if (file.type === 0)
                        ftp.$cache[path] = new jsDAV_Ftp_File(path, ftp);

                    if (ftp.$cache[path]) {
                        ftp.$cache[path].$stat = file;
                        next(null, ftp.$cache[path]);
                    }
                    else {
                        next(new Error("Unrecognized type of file: " + path));
                    }

                }
                else {
                    next(new Exc.jsDAV_Exception_FileNotFound(err));
                }
            }
        });
    };

    /**
     * Returns the real filesystem path for a webdav url.
     *
     * @param {String} publicPath
     * @return {String}
     */
    this.getRealPath = function(path) {
        return Path.normalize(Path.join(this.basePath, path));
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

        next(new Exc.jsDAV_Exception_NotImplemented(
            "Could not copy from " + source + " to " + destination + ". " +
            + "COPY/DUPLICATE not implemented.")
        );
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
            if (node.hasFeature(jsDAV.__ICOLLECTION__))
                repathChildren.call(_self, source, destination);

            next();
        });

        function repathChildren(oldParentPath, newParentPath) {
            var paths = Object.keys(this.ftp.$cache);
            var re = new RegExp("^" + oldParentPath.replace(/\//g, "\\/") + ".+$");
            var node;

            paths.forEach(function(path) {
                if (re.test(path)) {
                    //delete this.ftp.$cache[path];
                    path = newParentPath + path.substring(oldParentPath.length);
/*                    node = this.ftp.$cache[path];*/
                    //node.path = path;
                    /*this.ftp.$cache[path] = node;*/
                    this.ftp.$cache[path].path = path;
                }
            });
        }
    };

    /**
     * Caches a path's parent path and its children, then goes back to the caller function with the
     * same previous arguments.
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
                } else {
                    next();
                }
            });
        });
    };

    this.unmount = function() {
        console.log("\r\nClosed connection to the server. Unmounting FTP tree.");
        this.ftp.destroy();
    };

}).call(jsDAV_Tree_Ftp.prototype = new jsDAV_Tree());

