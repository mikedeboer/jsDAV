/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_FS_Node = require("./node");
var jsDAV_FS_File = require("./file");
var jsDAV_Collection = require("./../../collection");
var jsDAV_iQuota = require("./../../interfaces/iQuota");

var Fs = require("fs");
var Path = require("path");
var Async = require("asyncjs");
var Exc = require("./../../../shared/exceptions");
var Util = require("./../../../shared/util");

var jsDAV_FS_Directory = module.exports = jsDAV_FS_Node.extend(jsDAV_Collection, jsDAV_iQuota, {
    initialize: function(path) {
        this.path = path;
    },

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
        var newPath = Path.join(this.path, name);
        if (data.length === 0) {
            data = new Buffer(0);
            enc  = "binary";
        }
        Fs.writeFile(newPath, data, enc || "utf8", cbfscreatefile);
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
        // is it a chunked upload?
        var size = handler.httpRequest.headers["x-file-size"];
        if (size) {
            if (!handler.httpRequest.headers["x-file-name"])
                handler.httpRequest.headers["x-file-name"] = name;
            this.writeFileChunk(handler, enc, cbfscreatefile);
        }
        else {
            var newPath = Path.join(this.path, name);
            var stream = Fs.createWriteStream(newPath, {
                encoding: enc
            });
            handler.getRequestBody(enc, stream, false, cbfscreatefile);
        }
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
        var newPath = Path.join(this.path, name);
        var writeStream = Fs.createWriteStream(newPath, {
            encoding: enc || "binary"
        });
        writeStream.on("error", cbfscreatefile);
        writeStream.on("close", cbfscreatefile);
        stream.pipe(writeStream);
    },

    writeFileChunk: function(handler, type, cbfswritechunk) {
        var size = handler.httpRequest.headers["x-file-size"];
        if (!size)
            return cbfswritechunk("Invalid chunked file upload, the X-File-Size header is required.");
        var self = this;
        var filename = handler.httpRequest.headers["x-file-name"];
        var path = Path.join(this.path, filename);
        var track = handler.server.chunkedUploads[path];
        if (!track) {
            track = handler.server.chunkedUploads[path] = {
                path: Path.join(handler.server.tmpDir, Util.uuid()),
                filename: filename,
                timeout: null
            };
        }
        clearTimeout(track.timeout);
        path = track.path;
        // if it takes more than ten minutes for the next chunk to
        // arrive, remove the temp file and consider this a failed upload.
        track.timeout = setTimeout(function() {
            delete handler.server.chunkedUploads[path];
            Fs.unlink(path, function() {});
        }, 600000); //10 minutes timeout

        var stream = Fs.createWriteStream(path, {
            encoding: type,
            flags: "a"
        });

        stream.on("close", function() {
            Fs.stat(path, function(err, stat) {
                if (err)
                    return;

                if (stat.size === parseInt(size, 10)) {
                    delete handler.server.chunkedUploads[path];
                    Util.move(path, Path.join(self.path, filename), true, function(err) {
                        if (err)
                            return;
                        handler.dispatchEvent("afterBind", handler.httpRequest.url,
                            Path.join(self.path, filename));
                    });
                }
            });
        })

        handler.getRequestBody(type, stream, false, cbfswritechunk);
    },

    /**
     * Creates a new subdirectory
     *
     * @param {String} name
     * @return void
     */
    createDirectory: function(name, cbfscreatedir) {
        var newPath = Path.join(this.path, name);
        Fs.mkdir(newPath, "0755", cbfscreatedir);
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
                ? jsDAV_FS_Directory.new(path)
                : jsDAV_FS_File.new(path))
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
             .each(function(file, cbnextdirch) {
                 nodes.push(file.stat.isDirectory()
                     ? jsDAV_FS_Directory.new(file.path)
                     : jsDAV_FS_File.new(file.path)
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
        Async.rmtree(this.path, cbfsdel);
    },

    /**
     * Returns available diskspace information
     *
     * @return array
     */
    getQuotaInfo: function(cbfsquota) {
        if (!("statvfs" in Fs))
            return cbfsquota(null, [0, 0]);
        if (this.$statvfs) {
            return cbfsquota(null, [
                (this.$statvfs.blocks - this.$statvfs.bfree),// * this.$statvfs.bsize,
                this.$statvfs.bavail// * this.$statvfs.bsize
            ]);
        }
        Fs.statvfs(this.path, function(err, statvfs) {
            if (err || !statvfs)
                cbfsquota(err, [0, 0]);
            //_self.$statvfs = statvfs;
            cbfsquota(null, [
                (statvfs.blocks - statvfs.bfree),// * statvfs.bsize,
                statvfs.bavail// * statvfs.bsize
            ]);
        });
    }
});
