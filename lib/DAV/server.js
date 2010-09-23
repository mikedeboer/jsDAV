/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var Http   = require("http"),
    Url    = require("url"),
    Sys    = require("sys"),
    Fs     = require("fs"),
    Exc    = require("./exceptions"),

    // DAV classes used directly by the Server object
    jsDAV                             = require("./../jsdav"),
    jsDAV_Handler                     = require("./handler").jsDAV_Handler,
    jsDAV_SimpleDirectory             = require("./simpleDirectory").jsDAV_SimpleDirectory,
    jsDAV_ObjectTree                  = require("./objectTree").jsDAV_ObjectTree,
    jsDAV_Tree_Filesystem             = require("./tree/filesystem").jsDAV_Tree_Filesystem;

exports.DEFAULT_PORT   = 41197;
exports.DEFAULT_HOST   = "127.0.0.1";
exports.DEFAULT_TMPDIR = (function() {
    var value,
        def     = "/tmp",
        envVars = ["TMPDIR", "TMP", "TEMP"],
        i       = 0,
        l       = envVars.length;
    for(; i < l; ++i) {
        value = process.env[envVars[i]];
        if (value)
            return Fs.realpathSync(value);
    }
    return Fs.realpathSync(def);
})();

function Server(options) {
    /**
     * This is a flag that allow or not showing file, line and code
     * of the exception in the returned XML
     *
     * @var bool
     */
    this.debugExceptions = exports.debugMode;

    if (options && typeof options.tree == "object" && options.tree.hasFeature(jsDAV.__TREE__)) {
        this.tree = options.tree;
    }
    else if (options && typeof options.node == "object" && options.node.hasFeature(jsDAV.__INODE__)) {
        this.tree = new jsDAV_ObjectTree(options.node);
    }
    else if (options && typeof options.node == "string" && options.node.indexOf("/") > -1) {
        this.tree = new jsDAV_Tree_Filesystem(options.node);
    }
    else if (!options) {
        var root  = new jsDAV_SimpleDirectory("root");
        this.tree = new jsDAV_ObjectTree(root);
    }
    else {
        throw new Exc.jsDAV_Exception("Invalid argument passed to constructor. "
            + "Argument must either be an instance of jsDAV_Tree, jsDAV_iNode, "
            + "a valid path to a location on the local filesystem or null");
    }

    this.tmpDir = (options && options.tmpDir) || exports.DEFAULT_TMPDIR;
    var idx;
    if ((idx = this.tmpDir.lastIndexOf("/")) == this.tmpDir.length - 1)
        this.tmpDir = this.tmpDir.substring(0, idx);

    if (options.server && options.mount) { //use an existing server object
        var _self = this;
        this.setBaseUri("/" + options.mount.replace(/^[\/]+/, ""));

        var listeners = options.server.listeners("request");
        options.server.removeAllListeners("request");

        options.server.addListener("request", function(req, resp) {
            var path = Url.parse(req.url).pathname;
            if (path.charAt(path.length - 1) != "/")
                path = path + "/";
            if (path.indexOf(_self.baseUri) === 0) {
                _self.exec(req, resp);
            }
            else {
                for (var i = 0, len = listeners.length; i < len; ++i)
                    listeners[i].call(options.server, req, resp);
            }
        });
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
}).call(Server.prototype = Http.Server.prototype);

exports.createServer = function(options, port, host) {
    port = port || exports.DEFAULT_PORT;
    host = host || exports.DEFAULT_HOST;

    var server = new Server(options);
    server.listen(port, host, function() {
        Sys.puts("jsDAV server running on '" + host + "' port " + port);
    });
    return server;
};

exports.mount = function(path, mountpoint, server) {
    return new Server({
        node  : path,
        mount : mountpoint,
        server: server
    });
};
