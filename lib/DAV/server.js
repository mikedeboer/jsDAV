/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var Http = require("http");
var Url = require("url");
var Fs = require("fs");
var Exc = require("./../shared/exceptions");
var Util = require("./../shared/util");

// DAV classes used directly by the Server object
var jsDAV_Handler = require("./handler");
var jsDAV_SimpleCollection = require("./simpleCollection");
var jsDAV_ObjectTree = require("./objectTree");
var jsDAV_FS_Tree = require("./backends/fs/tree");
// interfaces to check for:
var jsDAV_Tree = require("./tree");
var jsDAV_iNode = require("./interfaces/iNode");

exports.DEFAULT_PORT = 41197;
exports.DEFAULT_HOST = "127.0.0.1";
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
        var name = filename.substr(0, filename.lastIndexOf("."));
        try {
            var pluginCls = require("./plugins/" + name);
            exports.DEFAULT_PLUGINS[pluginCls.name || name] = pluginCls;
        } catch (e) {
            Util.log("jsDAV cannot load plugin '" + name + "': " + e.message);
        }
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

    if (options.plugins) {
        var i, l;
        var plugins = {};
        if (Array.isArray(options.plugins)) {
            for (i = 0, l = options.plugins.length; i < l; ++i) {
                if (!options.plugins[i] || !options.plugins[i].name)
                    continue;
                plugins[options.plugins[i].name] = options.plugins[i];
            }
        }
        else
            Util.extend(plugins, options.plugins);

        this.plugins = plugins;
    }
    else
        this.plugins = Util.extend({}, exports.DEFAULT_PLUGINS);

    var root;
    // setup the filesystem tree for this server instance.
    if (typeof options.type == "string") {
        var TreeClass = require("./backends/" + options.type + "/tree");
        this.tree = TreeClass.new(options);
        if (options.baseUri)
            this.setBaseUri(options.baseUri);
    }
    else if (typeof options.node == "string" && options.node.indexOf("/") > -1) {
        this.tree = jsDAV_FS_Tree.new(options.node, options);
        if (options.baseUri)
            this.setBaseUri(options.baseUri);
    }
    else if (options.tree && options.tree.hasFeature(jsDAV_Tree)) {
        this.tree = options.tree;
        if (options.baseUri)
            this.setBaseUri(options.baseUri);
    }
    else if (options.node && Array.isArray(options.node)) {
        // If it's an array, a list of nodes was passed, and we need to
        // create the root node.
        options.node.forEach(function(node) {
            if (!node.hasFeature(jsDAV_iNode))
                throw new Error("Invalid argument passed to constructor. If you're passing an array, all the values must implement jsDAV_iNode");
        });

        root = jsDAV_SimpleCollection.new("root", options.node);
        this.tree = jsDAV_ObjectTree.new(root);
        if (options.baseUri)
            this.setBaseUri(options.baseUri);
    }
    else if (options.node && options.node.hasFeature(jsDAV_iNode)) {
        this.tree = jsDAV_ObjectTree.new(options.node, options);
        if (options.baseUri)
            this.setBaseUri(options.baseUri);
    }
    else {
        if (exports.debugMode) {
            Util.log("Invalid argument passed to constructor. "
                + "Argument must either be an instance of jsDAV_Tree, jsDAV_iNode, "
                + "a valid path to a location on the local filesystem or null", "error");
        }
        root = jsDAV_SimpleCollection.new("root");
        this.tree = jsDAV_ObjectTree.new(root, options);
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
        return options.server;
    }
    else {
        this.setBaseUri(this.guessBaseUri());

        Http.Server.call(this, this.exec);
    }
}

require("util").inherits(Server, Http.Server);

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
}).call(Server.prototype);

exports.Server = Server;

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
