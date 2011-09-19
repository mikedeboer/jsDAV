/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Sergi Mansilla <sergi AT ajax DOT org>
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
    this.basePath = this.options.path || ".";
    this.setup();
}

exports.jsDAV_Tree_Ftp = jsDAV_Tree_Ftp;

(function() {

    this.setup = function() {
        this.ftp = new Ftp(this.options);
        this.ftp.$cache = {};
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
        var node = this.ftp.$cache[source];
        var self = this;
        var ftp = this.ftp;

        if (!node) // This should only happen if the server crashed.
            return this.$getParentNodeRecall(source);

        node.setName(destination, function(err) {
            if (err)
                return next(err);

            ftp.$cache[destination] = node;
            delete ftp.$cache[source];
            if (node.hasFeature(jsDAV.__ICOLLECTION__))
                repathChildren(source, destination);

            next();
        });

        function repathChildren(oldParentPath, newParentPath) {
            var paths = Object.keys(ftp.$cache);
            var re = new RegExp("^" + oldParentPath.replace(/\//g, "\\/") + ".+$");

            paths.forEach(function(path) {
                if (ftp.$cache[path] && re.test(path)) {
                    var newPath = newParentPath + path.substring(oldParentPath.length);
                    if (!ftp.$cache[newPath])
                        ftp.$cache[newPath] = ftp.$cache[path];
                    else
                        // Not sure why the line below is useful for
                        ftp.$cache[newPath] && (ftp.$cache[newPath].path = newPath);

                    delete ftp.$cache[path];
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

