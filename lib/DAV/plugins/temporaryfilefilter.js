/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_Handler = require("./../handler");
var jsDAV_ServerPlugin = require("./../plugin");
var jsDAV_Property_GetLastModified = require("./../property/getLastModified");
var jsDAV_Property_ResourceType = require("./../property/resourceType");

var Fs = require("fs");
var Path = require("path");
var Async = require("asyncjs");
var Exc = require("./../../shared/exceptions");
var Util = require("./../../shared/util");

/**
 * Temporary File Filter Plugin
 *
 * The purpose of this filter is to intercept some of the garbage files
 * operation systems and applications tend to generate when mounting
 * a WebDAV share as a disk.
 *
 * It will intercept these files and place them in a separate directory.
 * these files are not deleted automatically, so it is adviceable to
 * delete these after they are not accessed for 24 hours.
 *
 * Currently it supports:
 *   * OS/X style resource forks and .DS_Store
 *   * desktop.ini and Thumbs.db (windows)
 *   * .*.swp (vim temporary files)
 *   * .dat.* (smultron temporary files)
 *
 * Additional patterns can be added, by adding on to the
 * temporaryFilePatterns property.
 */
var jsDAV_TemporaryFileFilter_Plugin = module.exports = jsDAV_ServerPlugin.extend({
    /**
     * This is the list of patterns we intercept.
     * If new patterns are added, they must be valid patterns for preg_match.
     *
     * @var array
     */
    temporaryFilePatterns: {
        "OS/X resource forks":            /^\._(.*)/,
        "OS/X custom folder settings":    /^\.DS_Store/,
        "Windows custom folder settings": /^desktop\.ini/,
        "Windows thumbnail cache":        /^Thumbs\.db/,
        "ViM temporary files":            /^\.(.*)\.swp/,
        "Smultron seems to create these": /^\.dat(.*)/,
        "Windows 7 lockfiles":            /^~lock\.(.*)#/
    },

    /**
     * This is the directory where this plugin
     * will store it's files.
     *
     * @var string
     */
    dataDir: null,

    initialize: function(handler) {
        this.handler = handler;

        /*
         * Make sure you specify a directory for your files. If you don't, we will
         * use the system's temp directory instead, and you might not want that.
         */
        this.dataDir = this.handler.server.tmpDir + "/jsdav";
        // ensure that the path is there
        Async.makePath(this.dataDir, function() {});

        this.handler.addEventListener("beforeMethod", this.beforeMethod.bind(this));
        this.handler.addEventListener("beforeCreateFile", this.beforeCreateFile.bind(this));
    },

    /**
     * This method is called before any HTTP method handler
     *
     * This method intercepts any GET, DELETE, PUT and PROPFIND calls to
     * filenames that are known to match the 'temporary file' regex.
     *
     * @param string method
     * @return bool
     */
    beforeMethod: function(e, method) {
        var tempLocation = this.isTempFile(this.handler.getRequestUri());
        var func         = "http" + method.charAt(0).toUpperCase() + method.substr(1).toLowerCase();
        if (!tempLocation || !this[func])
            return e.next();

        this[func](e, tempLocation);
    },

    /**
     * This method is invoked if some subsystem creates a new file.
     *
     * This is used to deal with HTTP LOCK requests which create a new
     * file.
     *
     * @param string uri
     * @param resource data
     * @return bool
     */
    beforeCreateFile: function(e, uri, data) {
        var tempPath = this.isTempFile(uri);
        if (!tempPath)
            return e.next();

        var enc = "utf8";
        if (!data || data.length === 0) { //new node version will support writing empty files?
            data = new Buffer(0);
            enc  = "binary";
        }
        Fs.writeFile(tempPath, data, enc, function(err) {
            if (err)
                return e.next(err);
            //@todo set response header: {"X-jsDav-Temp": "true"}
            e.stop();
        });
    },

    /**
     * This method will check if the url matches the temporary file pattern
     * if it does, it will return an path based on this.dataDir for the
     * temporary file storage.
     *
     * @param string path
     * @return boolean|string
     */
    isTempFile: function(path) {
        var tempFile;
        // We're only interested in the basename.
        var tempPath = Util.splitPath(path)[1];

        for (var i in this.temporaryFilePatterns) {
            tempFile = this.temporaryFilePatterns[i];
            if (tempFile.test(tempPath))
                return this.dataDir + "/jsdav_" + Util.md5(path) + ".tempfile";
        }
        return false;
    },

    /**
     * This method handles the GET method for temporary files.
     * If the file doesn't exist, it will return false which will kick in
     * the regular system for the GET method.
     *
     * @param string tempLocation
     * @return bool
     */
    httpGet: function(e, tempLocation) {
        var self = this;
        Path.exists(tempLocation, function(exists) {
            if (!exists)
                return e.next();

            Fs.stat(tempLocation, function(err, stat) {
                if (err)
                    return e.next(err);
                Fs.readFile(tempLocation, function(err, data) {
                    if (err)
                        return e.next(err);
                    var res = self.handler.httpResponse;
                    res.writeHead(200, {
                        "Content-Type":   "application/octet-stream",
                        "Content-Length": stat.size,
                        "X-jsDAV-Temp":   "true"
                    });
                    res.end(data);
                    e.stop();
                });
            });
        });
    },

    /**
     * This method handles the PUT method.
     *
     * @param string tempLocation
     * @return bool
     */
    httpPut: function(e, tempLocation) {
        var self = this;
        Path.exists(tempLocation, function(exists) {
            if (exists && self.handler.httpRequest.headers["if-none-match"]) {
                return e.next(new Exc.jsDAV_Exception_PreconditionFailed(
                    "The resource already exists, and an If-None-Match header was supplied")
                );
            }

            self.handler.getRequestBody("binary", function(err, body, cleanup) {
                if (err)
                    return e.next(err);
                Fs.writeFile(tempLocation, body, "binary", function(err) {
                    if (cleanup)
                        cleanup();
                    if (err)
                        return e.next(err);
                    var res = self.handler.httpResponse;
                    res.writeHead(!exists ? 201 : 200, {"X-jsDAV-Temp": "true"});
                    res.end();
                    e.stop();
                });
            });
        });
    },

    /**
     * This method handles the DELETE method.
     *
     * If the file didn't exist, it will return false, which will make the
     * standard HTTP DELETE handler kick in.
     *
     * @param string tempLocation
     * @return bool
     */
    httpDelete: function(e, tempLocation) {
        var self = this;
        Path.exists(tempLocation, function(exists) {
            if (!exists)
                return e.next();
            Fs.unlink(tempLocation, function(err) {
                if (err)
                    return e.next(err);
                var res = self.handler.httpResponse;
                res.writeHead(204, {"X-jsDAV-Temp": "true"});
                res.end();
                e.stop();
            });
        });
    },

    /**
     * This method handles the PROPFIND method.
     *
     * It's a very lazy method, it won't bother checking the request body
     * for which properties were requested, and just sends back a default
     * set of properties.
     *
     * @param string tempLocation
     * @return void
     */
    httpPropfind: function(e, tempLocation) {
        var self = this;
        Fs.stat(tempLocation, function(err, stat) {
            if (err || !stat)
                return e.next();

            self.handler.getRequestBody("utf8", function(err, data) {
                if (err)
                    return e.next(err);
                self.handler.parsePropfindRequest(data, function(err, requestedProps) {
                    if (!Util.empty(err))
                        return e.next(err);

                    var properties = {};
                    properties[tempLocation] = {
                        "href" : self.handler.getRequestUri(),
                        "200"  : {
                            "{DAV:}getlastmodified" : jsDAV_Property_GetLastModified.new(stat.mtime),
                            "{DAV:}getcontentlength" : stat.size,
                            "{DAV:}resourcetype" : jsDAV_Property_ResourceType.new(null)
                        }
                    };
                    properties[tempLocation]["200"]["{" + jsDAV_Handler.NS_AJAXORG + "}tempFile"] = true;

                    var res = self.handler.httpResponse;
                    res.writeHead(207, {
                        "Content-Type": "application/xml; charset=utf-8",
                        "X-jsDAV-Temp": "true"
                    });
                    res.end(self.handler.generateMultiStatus(properties));
                    e.stop();
                });
            });
        });
    }
});
