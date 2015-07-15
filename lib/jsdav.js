/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

exports.debugMode = false;

exports.createServer = function(options, port, host) {
    var DAV = require("./DAV/server");
    DAV.debugMode = exports.debugMode;
    return DAV.createServer(options, port, host);
};

/**
 * Create a jsDAV Server object that will not fire up listening to HTTP requests,
 * but instead will respond to requests that are passed to
 * 1) the custom NodeJS httpServer provided by the 'server' option or
 * 2) the Server.handle() function.
 *
 * @param {Object} options Options to be passed to the jsDAV Server object, which
 *                         should look like:
 * [code]
 * {
 *     node      : path,
 *     mount     : mountpoint,
 *     server    : server,
 *     standalone: standalone
 * }
 * [/code]
 */
exports.mount = function(options) {
    var DAV = require("./DAV/server");
    DAV.debugMode = exports.debugMode;
    return DAV.mount(options);
};

//@todo implement CalDAV
exports.createCalDAVServer = function(options, port, host) {
    var davServer = require("./DAV/server.js");
    // load CalDAV-Plugin
    if (!options.plugins) {
      console.log("loading caldavPlugin");
      var caldavPlugin = require("./CalDAV/plugin");
      var plugins = davServer.DEFAULT_PLUGINS;
      plugins[caldavPlugin.name] = caldavPlugin;
      options.plugins = plugins;
    }
    davServer.debugMode = exports.debugMode;
    return davServer.createServer(options, port, host);
};
