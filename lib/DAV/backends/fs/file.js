/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_FS_Node = require("./node");
var jsDAV_File = require("./../../file");

var Fs = require("fs");
var Exc = require("./../../../shared/exceptions");
var Util = require("./../../../shared/util");

var jsDAV_FS_File = module.exports = jsDAV_FS_Node.extend(jsDAV_File, {
    initialize: function(path) {
        this.path = path;
    },

    /**
     * Updates the data
     *
     * @param {mixed} data
     * @return void
     */
    put: function(data, type, cbfsput) {
        Fs.writeFile(this.path, data, type || "utf8", cbfsput);
    },

    /**
     * Updates the data whilst writing to a stream instead of from Buffer objects
     * that reside in memory.
     *
     * @param {mixed} data
     * @return void
     */
    putStream: function(handler, type, cbfsput) {
        var path = this.path;
        // is it a chunked upload?
        var size = handler.httpRequest.headers["x-file-size"];
        if (size) {
            var parts = Util.splitPath(this.path);
            if (!handler.httpRequest.headers["x-file-name"])
                handler.httpRequest.headers["x-file-name"] = parts[1];
            handler.getNodeForPath(parts[0], function(err, parent) {
                if (!Util.empty(err))
                    return cbfsput(err);

                parent.writeFileChunk(handler, type, cbfsput);
            });
        }
        else {
            var stream = Fs.createWriteStream(path, {
                encoding: type
            });
            handler.getRequestBody(type, stream, cbfsput);
        }
    },

    /**
     * Returns the data
     *
     * @return Buffer
     */
    get: function(cbfsfileget) {
        if (this.$buffer)
            return cbfsfileget(null, this.$buffer);
        //var _self  = this;
        var onRead = function(err, buff) {
            if (err)
                return cbfsfileget(err);
            // For older versions of node convert the string to a buffer.
            if (typeof buff === "string") {
                var b = new Buffer(buff.length);
                b.write(buff, "binary");
                buff = b;
            }
            // Zero length buffers act funny, use a string
            if (buff.length === 0)
                buff = "";
            //_self.$buffer = buff;
            cbfsfileget(null, buff);
        };

        // Node before 0.1.95 doesn't do buffers for fs.readFile
        if (process.version < "0.1.95" && process.version > "0.1.100") {
            // sys.debug("Warning: Old node version has slower static file loading");
            Fs.readFile(this.path, "binary", onRead);
        }
        else {
            Fs.readFile(this.path, onRead);
        }
    },

    /**
     * Returns the data whilst using a ReadStream so that excessive memory usage
     * is prevented.
     *
     * @return Buffer
     */
    getStream: function(start, end, cbfsfileget) {
        var options;
        if (typeof start == "number" && typeof end == "number")
            options = { start: start, end: end };
        var stream = Fs.createReadStream(this.path, options);

        stream.on("data", function(data) {
            cbfsfileget(null, data);
        });

        stream.on("error", function(err) {
            cbfsfileget(err);
        });

        stream.on("end", function() {
            // Invoking the callback without error and data means that the callee
            // can continue handling the request.
            cbfsfileget();
        });
    },

    /**
     * Delete the current file
     *
     * @return void
     */
    "delete": function(cbfsfiledel) {
        Fs.unlink(this.path, cbfsfiledel);
    },

    /**
     * Returns the size of the node, in bytes
     *
     * @return int
     */
    getSize: function(cbfsgetsize) {
        if (this.$stat)
            return cbfsgetsize(null, this.$stat.size);
        var self = this;
        return Fs.stat(this.path, function(err, stat) {
            if (err || !stat) {
                return cbfsgetsize(new Exc.jsDAV_Exception_FileNotFound("File at location "
                    + self.path + " not found"));
            }
            //_self.$stat = stat;
            cbfsgetsize(null, stat.size);
        });
    },

    /**
     * Returns the ETag for a file
     * An ETag is a unique identifier representing the current version of the file.
     * If the file changes, the ETag MUST change.
     * Return null if the ETag can not effectively be determined
     *
     * @return mixed
     */
    getETag: function(cbfsgetetag) {
        cbfsgetetag(null, null);
    },

    /**
     * Returns the mime-type for a file
     * If null is returned, we'll assume application/octet-stream
     *
     * @return mixed
     */
    getContentType: function(cbfsmime) {
        return cbfsmime(null, Util.mime.type(this.path));
    }
});
