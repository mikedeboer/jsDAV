/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var Base = require("./../shared/base");

/**
 * The baseclass for all server plugins.
 *
 * Plugins can modify or extend the servers behaviour.
 */
var jsDAV_ServerPlugin = module.exports = Base.extend({
    /**
     * This initializes the plugin.
     *
     * This function is called by jsDAV_Server, after
     * addPlugin is called.
     *
     * This method should set up the requires event subscriptions.
     *
     * @param {jsDAV_Server} server
     * @return void
     */
    initialize: function(server) {},

    /**
     * This method should return a list of server-features.
     *
     * This is for example 'versioning' and is added to the DAV: header
     * in an OPTIONS response.
     *
     * @return {Object}
     */
    getFeatures: function() {
        return [];
    },

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
    getHTTPMethods: function(uri) {
        return [];
    }
});
