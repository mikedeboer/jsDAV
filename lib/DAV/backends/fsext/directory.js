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
var Path = require("path");
var Async = require("asyncjs");
var Exc = require("./../../../shared/exceptions");
var Util = require("./../../../shared/util");

function afterCreateFile(name, cbfscreatefile, err) {
    if (err)
        cbfscreatefile(err);

    var stream = Fs.createReadStream(Path.join(this.path, name));
    Util.createHashStream(stream, function(err, hash) {
        if (err)
            return cbfscreatefile(err);
        cbfscreatefile(null, '"' + hash + '"');
    });
}

var jsDAV_FSExt_Directory = module.exports = jsDAV_FS_Directory.extend(jsDAV_FSExt_Node, {
    /**
     * Creates a new file in the directory
     *
     * data is a Buffer resource
     *
     * @param {String} name Name of the file
     * @param {Buffer} data Initial payload
     * @param {String} [enc]
     * @param {Function} cbfscreatefile
     * @return void
     */
    createFile: function(name, data, enc, cbfscreatefile) {
        jsDAV_FS_Directory.createFile.call(this, name, data, enc,
            afterCreateFile.bind(this, name, cbfscreatefile));
    },


    /**
     * Creates a new file in the directory whilst writing to a stream instead of
     * from Buffer objects that reside in memory.
     *
     * @param {jsDAV_Handler} handler
     * @param {String} name Name of the file
     * @param {String} [enc]
     * @param {Function} cbfscreatefile
     * @return void
     */
    createFileStream: function(handler, name, enc, cbfscreatefile) {
        jsDAV_FS_Directory.createFileStream.call(this, handler, name, enc,
            afterCreateFile.bind(this, name, cbfscreatefile));
    },

    /**
     * Creates a new file in the directory whilst writing to a stream instead of
     * from Buffer objects that reside in memory. The difference with
     * `createFileStream()` is that this function requires a Stream as
     *
     * @param {String} name Name of the file
     * @param {Stream} stream Read-Stream of a file resource
     * @param {String} [enc]
     * @param {Function} cbfscreatefile
     * @return void
     */
    createFileStreamRaw: function(name, stream, enc, cbfscreatefile) {
        jsDAV_FS_Directory.createFileStreamRaw.call(this, name, stream, enc,
            afterCreateFile.bind(this, name, cbfscreatefile));
    },

    /**
     * Returns a specific child node, referenced by its name
     *
     * @param {String} name
     * @throws Sabre_DAV_Exception_FileNotFound
     * @return Sabre_DAV_INode
     */
    getChild: function(name, cbfsgetchild) {
        var path = Path.join(this.path, name);

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
