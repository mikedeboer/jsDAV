/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_Ftp_Node = require("./node");
var jsDAV_Ftp_File = require("./file");
var jsDAV_Directory = require("./../../directory");
var jsDAV_iQuota = require("./../../interfaces/iQuota");

var Path = require("path");
var Async = require("asyncjs");
var Exc = require("./../../../shared/exceptions");

var jsDAV_Ftp_Directory = module.exports = jsDAV_Ftp_Node.extend(jsDAV_Directory, jsDAV_iQuota, {
    initialize: function(path, ftp) {
        this.path = path || "";
        this.ftp = ftp;
    },

    /**
     * Creates a new file in the directory
     *
     * data is a readable stream resource
     *
     * @param string name Name of the file
     * @param resource data Initial payload
     * @return void
     */
    createFile: function(name, data, enc, cbftpcreatefile) {
        var newPath = Path.join(this.path, name);
        if (data.length === 0) { //ftp lib does not support writing empty files...
            data = new Buffer("empty file");
            enc  = "binary";
        }

        var newFile = new jsDAV_Ftp_File(newPath, this.ftp);
        newFile.put(data, enc, function(err) {
            if(err)
                return cbftpcreatefile(err);

            cbftpcreatefile(null, newFile);
        });
    },

    /**
     * Creates a new subdirectory
     *
     * @param string name
     * @return void
     */
    createDirectory: function(name, cbftpcreatedir) {
        var newPath = Path.join(this.path, name);
        var self = this;
        this.ftp.raw.mkd(newPath, function(err) {
            if (err)
                return cbftpcreatedir(err);

            cbftpcreatedir(null, new jsDAV_Ftp_Directory(newPath, self.ftp));
        });
    },

    /**
     * Returns a specific child node, referenced by its name
     *
     * @param string name
     * @throws Sabre_DAV_Exception_FileNotFound
     * @return Sabre_DAV_INode
     */
    getChild: function(stat, cbftpgetchild) {
        if (typeof stat !== "object")
            return cbftpgetchild(new Exc.jsDAV_Exception_FileNotFound("Child node could not be retrieved"));

        var ftp = this.ftp;
        var path = Path.join(this.path, stat.name);

        if (ftp.$cache[path])
            return cbftpgetchild(null, ftp.$cache[path]);

        // Helper function that calls the next function `cbftpgetchild` given
        // a type (file or directory, 0 or 1) and a destination path.
        function getDAVObject(type /*int*/, path) {
            if (type === 1)
                ftp.$cache[path] = new jsDAV_Ftp_Directory(path, ftp);
            else if (type === 0)
                ftp.$cache[path] = new jsDAV_Ftp_File(path, ftp);
            else {
                return cbftpgetchild(
                    new Exc.jsDAV_Exception_UnsupportedMediaType(path));
            }

            ftp.$cache[path].$stat = stat;
            cbftpgetchild(null, ftp.$cache[path]);
        }

        // If `stat` has a target it means that it is a symbolic link, in which
        // case we check that its target exists (or that we can actually reach
        // it). After that we give back a DAV object of the type of the target,
        // but with the path of the symlink.
        /*
        if (stat.target) {
            var targetPath = Path.resolve(Path.dirname(path), stat.target);
            ftp.ls(Path.dirname(targetPath), function(err, stats) {
                if (err)
                    return cbftpgetchild(
                        new Exc.jsDAV_Exception_FileNotFound(err));

                var targetStat;
                for (var i = 0; i < stats.length; i++) {
                    if (stats[i].name === stat.target) {
                        targetStat = stats[i];
                        break;
                    }
                }

                if (targetStat)
                    getDAVObject(targetStat.type, path);
                else
                    return cbftpgetchild(
                        new Exc.jsDAV_Exception_FileNotFound(targetPath));
            });
        }
        */
        //else {
            getDAVObject(stat.type, path);
        //}
    },

    /**
     * Returns an array with all the child nodes
     *
     * @return Sabre_DAV_INode[]
     */
    getChildren: function(cbftpgetchildren) {
        var nodes = [];
        var self = this;

        this.ftp.ls(this.path, function(err, listing) {
            if (err)
                return cbftpgetchildren(err);
            if (!listing)
                return cbftpgetchildren(null, nodes);

            Async.list(listing)
                .delay(0, 30)
                .each(function(node, next) {
                    self.getChild(node, function(err, node) {
                        if (err)
                            return next();

                        nodes.push(node);
                        next();
                    });
                })
                .end(function() {
                    cbftpgetchildren(null, nodes);
                });
        });
    },

    /**
     * Delete nodes in this directory recursively and finishes by deleting itself
     *
     * @return void
     */
    "delete": function(cbftpdel) {
        var self = this;

        var rmd = function() {
            self.ftp.raw.rmd(self.path, function(err) {
                if (err)
                    return cbftpdel(err);

                delete self.ftp.$cache[self.path];
                cbftpdel();
            });
        };

        this.getChildren(function(err, children) {
            if (err)
                return cbftpdel(err);

            if (children.length) {
                Async
                    .list(children)
                    .each(function(node, next) {
                        node["delete"](function(err) {
                            if (err)
                                return cbftpdel(err);
                            next();
                        });
                    })
                    .end(function() { rmd(cbftpdel); });
            } else {
                rmd(cbftpdel);
            }
        });
    },

    /**
     * Returns available diskspace information
     *
     * @return array
     */
    getQuotaInfo: function(cbfsquota) {
        // @todo: impl. ftp.statvfs();
        return cbfsquota(null, [0, 0]);
    }
});
