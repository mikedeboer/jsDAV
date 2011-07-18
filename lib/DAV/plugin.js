/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV = require("./../jsdav"),
    Util  = require("./util");

/**
 * The baseclass for all server plugins.
 *
 * Plugins can modify or extend the servers behaviour.
 */
function jsDAV_ServerPlugin() {}

exports.jsDAV_ServerPlugin = jsDAV_ServerPlugin;

(function() {
    this.REGBASE = this.REGBASE | jsDAV.__PLUGIN__;

    /**
     * This initializes the plugin.
     *
     * This function is called by Sabre_DAV_Server, after
     * addPlugin is called.
     *
     * This method should set up the requires event subscriptions.
     *
     * @param {jsDAV_Server} server
     * @return void
     */
    this.initialize = function(server) {};

    /**
     * This method should return a list of server-features.
     *
     * This is for example 'versioning' and is added to the DAV: header
     * in an OPTIONS response.
     *
     * @return {Object}
     */
    this.getFeatures = function() {
        return [];
    };

    /**
     * Use this method to tell the server this plugin defines additional
     * HTTP methods.
     *
     * This method is passed a uri. It should only return HTTP methods that are
     * available for the specified uri.
     *
     * @param {string} uri
     * @return {array}
     */
    this.getHTTPMethods = function(uri) {
        return [];
    };
}).call(jsDAV_ServerPlugin.prototype = new jsDAV.jsDAV_Base());
