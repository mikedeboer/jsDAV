/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV           = require("./../jsdav"),
    jsDAV_FS_Node   = require("./node").jsDAV_FS_Node,
    jsDAV_FS_File   = require("./file").jsDAV_FS_File,
    jsDAV_Directory = require("./../directory").jsDAV_Directory,
    jsDAV_iQuota    = require("./../iQuota").jsDAV_iQuota,

    Fs              = require("fs"),
    Async           = require("./../../../vendor/async.js/lib/async/index"),
    Exc             = require("./../exceptions");

function jsDAV_FS_Directory(path) {
    this.path = path;
}

exports.jsDAV_FS_Directory = jsDAV_FS_Directory;

(function() {
    this.implement(jsDAV_Directory, jsDAV_iQuota);

    /**
     * Creates a new file in the directory
     *
     * data is a readable stream resource
     *
     * @param string name Name of the file
     * @param resource data Initial payload
     * @return void
     */
    this.createFile = function(name, data, callback) {
        var newPath = this.path + "/" + name;
        if (typeof data == "string")
            Fs.rename(data, newPath, callback);
        else
            Fs.writeFile(newPath, data, callback)
    };

    /**
     * Creates a new subdirectory
     *
     * @param string name
     * @return void
     */
    this.createDirectory = function(name, callback) {
        var newPath = this.path + "/" + name;
        Fs.mkdir(newPath, 0755, callback);
    };

    /**
     * Returns a specific child node, referenced by its name
     *
     * @param string name
     * @throws Sabre_DAV_Exception_FileNotFound
     * @return Sabre_DAV_INode
     */
    this.getChild = function(name, callback) {
        var path = this.path + "/" + name;

        Fs.stat(path, function(err, stat) {
            if (err || !stat) {
                callback(new Exc.jsDAV_Exception_FileNotFound("File with name " 
                    + path + " could not be located"));
            }
            callback(null, stat.isDirectory()
                ? new jsDAV_FS_Directory(path)
                : new jsDAV_FS_File(path))
        });
    };

    /**
     * Returns an array with all the child nodes
     *
     * @return Sabre_DAV_INode[]
     */
    this.getChildren = function(callback) {
        var nodes = [];
        Async.readdir(this.path)
             .stat()
             .each(function(file) {
                 nodes.push(file.stat.isDirectory()
                     ? new jsDAV_FS_Directory(file.path)
                     : new jsDAV_FS_File(file.path)
                 );
             })
             .end(function() {
                 callback(null, nodes);
             });
    };

    /**
     * Deletes all files in this directory, and then itself
     *
     * @return void
     */
    this["delete"] = function(callback) {
        Async.rmtree(this.path, callback);
    };

    /**
     * Returns available diskspace information
     *
     * @return array
     */
    this.getQuotaInfo = function(callback) {
        Fs.vstatfs(this.path, function(err, stat) {
            if (err || !stat)
                callback(err, 0);
            callback(null, [
                stat.bavail - stat.bfree,
                stat.bfree
            ]);
        });
    };
}).call(jsDAV_FS_Directory.prototype = new jsDAV_FS_Node());
