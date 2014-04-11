/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_FS_Directory = require("./../fs/directory");
var jsDAV_FSExt_File = require("./file");
var jsDAV_FSExt_Node = require("./node");

var Fs = require("fs");
var Async = require("asyncjs");
var Exc = require("./../../../shared/exceptions");

var jsDAV_FSExt_Directory = module.exports = jsDAV_FS_Directory.extend(jsDAV_FSExt_Node, {
    /**
     * Returns a specific child node, referenced by its name
     *
     * @param {String} name
     * @throws Sabre_DAV_Exception_FileNotFound
     * @return Sabre_DAV_INode
     */
    getChild: function(name, cbfsgetchild) {
        var path = this.path + "/" + name;

        Fs.stat(path, function(err, stat) {
            if (err || typeof stat == "undefined") {
                return cbfsgetchild(new Exc.FileNotFound("File with name "
                    + path + " could not be located"));
            }
            cbfsgetchild(null, stat.isDirectory()
                ? jsDAV_FSExt_Directory.new(path)
                : jsDAV_FSExt_File.new(path))
        });
    },

    /**
     * Returns an array with all the child nodes
     *
     * @return jsDAV_iNode[]
     */
    getChildren: function(cbfsgetchildren) {
        var nodes = [];
        Async.readdir(this.path)
             .stat()
             .filter(function(file) {
                return file.indexOf(jsDAV_FSExt_File.PROPS_DIR) !== 0;
             })
             .each(function(file, cbnextdirch) {
                 nodes.push(file.stat.isDirectory()
                     ? jsDAV_FSExt_Directory.new(file.path)
                     : jsDAV_FSExt_File.new(file.path)
                 );
                 cbnextdirch();
             })
             .end(function() {
                 cbfsgetchildren(null, nodes);
             });
    },

    /**
     * Deletes all files in this directory, and then itself
     *
     * @return void
     */
    "delete": function(cbfsdel) {
        var self = this;
        Async.rmtree(this.path, function(err) {
            if (err)
                return cbfsdel(err);
            self.deleteResourceData(cbfsdel);
        });
    }
});
