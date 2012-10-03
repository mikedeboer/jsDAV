/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var Http   = require("http");
var Url    = require("url");
var Fs     = require("fs");
var Exc    = require("./exceptions");
var Util   = require("./util");

// DAV classes used directly by the Server object
var jsDAV                 = require("./../jsdav");
var jsDAV_Handler         = require("./handler").jsDAV_Handler;
var jsDAV_SimpleDirectory = require("./simpleDirectory").jsDAV_SimpleDirectory;
var jsDAV_ObjectTree      = require("./objectTree").jsDAV_ObjectTree;
var jsDAV_Tree_Filesystem = require("./tree/filesystem").jsDAV_Tree_Filesystem;

exports.DEFAULT_PORT   = 41197;
exports.DEFAULT_HOST   = "127.0.0.1";
exports.DEFAULT_TMPDIR = (function() {
    var value;
    var def     = "/tmp";
    var envVars = ["TMPDIR", "TMP", "TEMP"];
    var i       = 0;
    var l       = envVars.length;
    for (; i < l; ++i) {
        value = process.env[envVars[i]];
        if (value)
            return Fs.realpathSync(value).replace(/\/+$/, "");
    }
    return Fs.realpathSync(def).replace(/\/+$/, "");
})();

/**
 * Auto-load bundled plugins.
 */
exports.DEFAULT_PLUGINS = {};
Fs.readdirSync(__dirname + "/plugins").forEach(function(filename){
    if (/\.js$/.test(filename)) {
        var name = filename.substr(0, filename.lastIndexOf('.'));
        exports.DEFAULT_PLUGINS[name] = require("./plugins/" + name);
    }
});

/**
 * jsDAV version number
 */
exports.VERSION = JSON.parse(Fs.readFileSync(__dirname + "/../../package.json")).version;

function Server(options) {
    /**
     * This is a flag that allow or not showing file, line and code
     * of the exception in the returned XML
     *
     * @var bool
     */
    this.debugExceptions = exports.debugMode;

    options = options || {};
    this.options = options;

    this.chunkedUploads = {};

    if (typeof options.standalone == "undefined")
        options.standalone = true;

    this.plugins = Util.extend({}, exports.DEFAULT_PLUGINS);

    if (options.plugins) {
        if (!Array.isArray(options.plugins))
            options.plugins = Object.keys(options.plugins);
        var allPlugins = Object.keys(this.plugins);
        for (var i = 0, l = allPlugins.length; i < l; ++i) {
            // if the plugin is not in the list options.plugins, remove it from
            // the available plugins altogether so that the handler won't know
            // they exist.
            if (options.plugins.indexOf(allPlugins[i]) == -1)
                delete this.plugins[allPlugins[i]];
        }
    }

    // setup the filesystem tree for this server instance.
    if (typeof options.tree == "object" && options.tree.hasFeature(jsDAV.__TREE__)) {
        this.tree = options.tree;
    }
    else if (typeof options.node == "object" && options.node.hasFeature(jsDAV.__INODE__)) {
        this.tree = new jsDAV_ObjectTree(options.node, options);
    }
    else if (typeof options.type == "string") {
        if (options.type == "sftp") {
            var jsDAV_Tree_Sftp = require("./tree/sftp").jsDAV_Tree_Sftp;
            this.tree = new jsDAV_Tree_Sftp(options);
        }
        else if (options.type == "ftp") {
            var jsDAV_Tree_Ftp = require("./tree/ftp").jsDAV_Tree_Ftp;
            this.tree = new jsDAV_Tree_Ftp(options);
        }
    }
    else if (typeof options.node == "string" && options.node.indexOf("/") > -1) {
        this.tree = new jsDAV_Tree_Filesystem(options.node, options);
    }
    else {
        if (exports.debugMode) {
            Util.log("Invalid argument passed to constructor. "
                + "Argument must either be an instance of jsDAV_Tree, jsDAV_iNode, "
                + "a valid path to a location on the local filesystem or null", "error");
        }
        var root  = new jsDAV_SimpleDirectory("root");
        this.tree = new jsDAV_ObjectTree(root, options);
    }

    this.tmpDir = (options.tmpDir || exports.DEFAULT_TMPDIR).replace(/\/+$/, "");

    if (options.server && options.mount) { //use an existing server object
        var self = this;
        this.sandboxed = typeof options.sandboxed != "undefined"
            ? options.sandboxed
            : true;
        if (this.sandboxed)
            this.tree.setSandbox(this.tree.basePath);
        this.setBaseUri("/" + options.mount.replace(/^\/+/, ""));

        if (options.standalone) {
            var listeners = options.server.listeners("request");
            options.server.removeAllListeners("request");

            options.server.addListener("request", function(req, resp) {
                var path = Url.parse(req.url).pathname;
                if (path.charAt(path.length - 1) != "/")
                    path = path + "/";
                if (path.indexOf(self.baseUri) === 0) {
                    self.exec(req, resp);
                }
                else {
                    for (var i = 0, len = listeners.length; i < len; ++i)
                        listeners[i].call(options.server, req, resp);
                }
            });
        }
    }
    else {
        this.setBaseUri(this.guessBaseUri());

        Http.Server.call(this, this.exec);
    }
}

(function() {
    /**
     * The base uri
     *
     * @var string
     */
    this.baseUri = "/";

    /**
     * The tree object
     *
     * @var jsDAV_Tree
     */
    this.tree = null;

    /**
     * The list of plugins
     *
     * @var array
     */
    this.plugins = {};

    /**
     * If this server instance is a DAV mount, this means that it operates from
     * within a sandbox.
     *
     * @var Boolean
     */
    this.sandboxed = false;

    /**
     * Called when an http request comes in, pass it on to the Handler
     *
     * @param {ServerRequest}  req
     * @param {ServerResponse} resp
     * @return void
     */
    this.exec = function(req, resp) {
        new jsDAV_Handler(this, req, resp);
    };

    /**
     * Sets the base server uri
     *
     * @param  {String} uri
     * @return {void}
     */
    this.setBaseUri = function(uri) {
        // If the baseUri does not end with a slash, we must add it
        if (uri.charAt(uri.length - 1) !== "/")
            uri += "/";

        this.baseUri = uri;
    };

    /**
     * Returns the base responding uri
     *
     * @return {String}
     */
    this.getBaseUri = function() {
        return this.baseUri;
    };

    /**
     * This method attempts to detect the base uri.
     * Only the PATH_INFO variable is considered.
     *
     * If this variable is not set, the root (/) is assumed.
     *
     * @return {String}
     * @throws {Error}
     */
    this.guessBaseUri = function(handler) {
        var pos, pathInfo, uri;

        if (handler && handler.httpRequest) {
            uri      = handler.httpRequest.url;
            pathInfo = Url.parse(uri).pathname;
        }

        // If PATH_INFO is not found, we just return /
        if (pathInfo) {
            // We need to make sure we ignore the QUERY_STRING part
            if ((pos = uri.indexOf("?")) > -1)
                uri = uri.substr(0, pos);

            // PATH_INFO is only set for urls, such as: /example.php/path
            // in that case PATH_INFO contains "/path".
            // Note that REQUEST_URI is percent encoded, while PATH_INFO is
            // not, Therefore they are only comparable if we first decode
            // REQUEST_INFO as well.
            var decodedUri = unescape(uri);

            // A simple sanity check:
            if (decodedUri.substr(decodedUri.length - pathInfo.length) === pathInfo) {
                var baseUri = decodedUri.substr(0, decodedUri.length - pathInfo.length);
                return Util.rtrim(baseUri, "/") + "/";
            }

            throw new Exc.jsDAV_Exception("The REQUEST_URI (" + uri
                + ") did not end with the contents of PATH_INFO (" + pathInfo
                + "). This server might be misconfigured.");
        }

        // The fallback is that we're just going to assume the server root.
        return "/";
    };
}).call(Server.prototype = Http.Server.prototype);

exports.createServer = function(options, port, host) {
    port = port || exports.DEFAULT_PORT;
    host = host || exports.DEFAULT_HOST;

    var server = new Server(options);
    server.listen(port, host, function() {
        Util.log("jsDAV server running on http://" + host + ":" + port);
    });
    return server;
};

exports.mount = function(options) {
    var s = new Server(options);
    s.unmount = function() {
        if (this.tree.unmount)
            this.tree.unmount();
    };
    return s;
};
