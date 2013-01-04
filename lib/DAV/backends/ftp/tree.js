/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Sergi Mansilla <sergi AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_Tree = require("./../../tree");
var jsDAV_Ftp_Directory = require("./directory");
var jsDAV_Ftp_File = require("./file");
var jsDav_iCollection = require("./../../interfaces/iCollection");

var Path = require("path");
var Ftp = require("jsftp");
var Exc = require("./../../../shared/exceptions");
var Util = require("./../../../shared/util");

/**
 * jsDAV_Tree_Ftp
 *
 * Creates the FTP tree.
 *
 * @param {Object} options
 * @contructor
 */

Ftp.debugMode = require("../../jsdav").debugMode;

var jsDAV_Tree_Ftp = module.exports = jsDAV_Tree.extend({
    initialize: function(options) {
        this.ftpCmdListeners = [];
        this.options = options.ftp;
        if (this.options.path) {
            if (this.options.path.charAt(0) !== "/")
                this.options.path = "/" + this.options.path;
        }
        else {
            this.options.path = "/";
        }
        this.basePath = this.options.path;
        this.setup();
    },

    setup: function() {
        var ftp = this.ftp = new Ftp(this.options);
        this.ftp.$cache = {};
        this.ftpCmdListeners.forEach(function(listener) {
            ftp.addCmdListener(listener);
        });
    },

    addFtpCmdListener: function(listener) {
        if (this.ftp)
            this.ftp.addCmdListener(listener);
        else
            this.ftpCmdListeners.push(listener);
    },

    /**
     * Returns a new node for the given path
     *
     * @param {String} path
     * @return void
     */
    getNodeForPath: function(path, next) {
        if (!path || path.match(/^\s+$/) || path.match(/^[\/]+$/))
            path = this.basePath;
        else if (Path.dirname(path) === ".") // It is a file in the root
            path = Path.join(this.basePath, path);

        if (!this.ftp)
            this.setup();

        var ftp = this.ftp;

        if (ftp.$cache[path]) {
            return next(null, ftp.$cache[path]);
        }

        // Root node requires special treatment because it will not be listed
        if (path === this.basePath) {
            var baseDir = new jsDAV_Ftp_Directory(path, ftp);
            baseDir.isRoot = true;
            return next(null, ftp.$cache[path] = baseDir);
        }

        var self = this;
        var baseName = Path.basename(path).replace("/", "");
        path = this.getRealPath(path);
        var parentDir = Path.resolve(path + "/..");
        ftp.ls(parentDir, function(err, res) {
            if (err) {
                if (res && res.code === 530) // Not logged in
                    ftp.auth(self.options.user, self.options.pass, function(err, res) {
                        if (!err)
                            self.getNodeForPath(path, next);
                        else
                            Util.log(err, "error");
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
    },

    /**
     * Returns the real filesystem path for a webdav url.
     *
     * @param {String} publicPath
     * @return {String}
     */
    getRealPath: function(path) {
        var _basePath = Util.rtrim(this.basePath);
        var _path = Util.trim(path).replace(/[\/]+$/, "");
        var re = new RegExp("^" + Util.escapeRegExp(_basePath));

        if (_path.match(re)) {
            return _path;
        }
        else {
            return Path.normalize(Path.join(_basePath, _path));
        }
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
    copy: function(source, destination, next) {
        next(new Exc.jsDAV_Exception_NotImplemented(
            "Could not copy from " + source + " to " + destination
            + ". COPY/DUPLICATE not implemented.")
        );
    },

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
    move: function(source, destination, next) {
        source = this.getRealPath(source);
        destination = this.getRealPath(destination);

        var node = this.ftp.$cache[source];
        var ftp = this.ftp;

        if (!node)
            return next(new Error("Node not found for path " + source));

        node.setName(destination, function(err) {
            if (err)
                return next(err);

            ftp.$cache[destination] = node;
            delete ftp.$cache[source];
            if (node.hasFeature(jsDav_iCollection))
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
    },

    unmount: function() {
        Util.log("Closed connection to the server. Unmounting FTP tree.");
        if (this.ftp) {
            this.ftp.destroy();
            this.ftp = null;
        }
    }
});
