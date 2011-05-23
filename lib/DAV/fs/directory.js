/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV             = require("./../../jsdav"),
    jsDAV_FS_Node     = require("./node").jsDAV_FS_Node,
    jsDAV_FS_File     = require("./file").jsDAV_FS_File,
    jsDAV_Directory   = require("./../directory").jsDAV_Directory,
    jsDAV_iCollection = require("./../iCollection").jsDAV_iCollection,
    jsDAV_iQuota      = require("./../iQuota").jsDAV_iQuota,

    Fs                = require("fs"),
    Async             = require("./../../../support/async.js"),
    Exc               = require("./../exceptions");

function jsDAV_FS_Directory(path) {
    this.path = path;
}

exports.jsDAV_FS_Directory = jsDAV_FS_Directory;

(function() {
    this.implement(jsDAV_Directory, jsDAV_iCollection, jsDAV_iQuota);

    /**
     * Creates a new file in the directory
     *
     * data is a readable stream resource
     *
     * @param string name Name of the file
     * @param resource data Initial payload
     * @return void
     */
    this.createFile = function(name, data, enc, cbfscreatefile) {
        var newPath = this.path + "/" + name;
        if (data.length === 0) { //new node version will support writing empty files?
            data = new Buffer(0);
            enc  = "binary";
        }
        Fs.writeFile(newPath, data, enc || "utf8", cbfscreatefile);
    };

    /**
     * Creates a new subdirectory
     *
     * @param string name
     * @return void
     */
    this.createDirectory = function(name, cbfscreatedir) {
        var newPath = this.path + "/" + name;
        Fs.mkdir(newPath, 0755, cbfscreatedir);
    };

    /**
     * Returns a specific child node, referenced by its name
     *
     * @param string name
     * @throws Sabre_DAV_Exception_FileNotFound
     * @return Sabre_DAV_INode
     */
    this.getChild = function(name, cbfsgetchild) {
        var path = this.path + "/" + name;

        Fs.stat(path, function(err, stat) {
            if (err || typeof stat == "undefined") {
                return cbfsgetchild(new Exc.jsDAV_Exception_FileNotFound("File with name "
                    + path + " could not be located"));
            }
            cbfsgetchild(null, stat.isDirectory()
                ? new jsDAV_FS_Directory(path)
                : new jsDAV_FS_File(path))
        });
    };

    /**
     * Returns an array with all the child nodes
     *
     * @return Sabre_DAV_INode[]
     */
    this.getChildren = function(cbfsgetchildren) {
        var nodes = [];
        Async.readdir(this.path)
             .stat()
             .each(function(file, cbnextdirch) {
                 nodes.push(file.stat.isDirectory()
                     ? new jsDAV_FS_Directory(file.path)
                     : new jsDAV_FS_File(file.path)
                 );
                 cbnextdirch();
             })
             .end(function() {
                 cbfsgetchildren(null, nodes);
             });
    };

    /**
     * Deletes all files in this directory, and then itself
     *
     * @return void
     */
    this["delete"] = function(cbfsdel) {
        Async.rmtree(this.path, cbfsdel);
    };

    /**
     * Returns available diskspace information
     *
     * @return array
     */
    this.getQuotaInfo = function(cbfsquota) {
        if (!("statvfs" in Fs))
            return cbfsquota(null, [0, 0]);
        if (this.$statvfs) {
            return cbfsquota(null, [
                (this.$statvfs.blocks - this.$statvfs.bfree),// * this.$statvfs.bsize,
                this.$statvfs.bavail// * this.$statvfs.bsize
            ]);
        }
        var _self = this;
        Fs.statvfs(this.path, function(err, statvfs) {
            if (err || !statvfs)
                cbfsquota(err, [0, 0]);
            //_self.$statvfs = statvfs;
            cbfsquota(null, [
                (statvfs.blocks - statvfs.bfree),// * statvfs.bsize,
                statvfs.bavail// * statvfs.bsize
            ]);
        });
    };
}).call(jsDAV_FS_Directory.prototype = new jsDAV_FS_Node());
