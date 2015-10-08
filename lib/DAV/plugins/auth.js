/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_ServerPlugin = require("./../plugin");

var AsyncEventEmitter = require("./../../shared/asyncEvents").EventEmitter;

/**
 * This plugin provides Authentication for a WebDAV server.
 *
 * It relies on a Backend object, which provides user information.
 *
 * Additionally, it provides support for:
 *  * {DAV:}current-user-principal property from RFC5397
 *  * {DAV:}principal-collection-set property from RFC3744
 */
var jsDAV_Auth_Plugin = module.exports = jsDAV_ServerPlugin.extend({
    /**
     * Plugin name
     *
     * @var String
     */
    name: "auth",
    
    /**
     * Authentication backend
     *
     * @var jsDAV_Auth_Backend_Abstract
     */
    authBackend: null,

    /**
     * The authentication realm.
     *
     * @var string
     */
    realm: null,

    initialize: function(handler) {
        this.handler = handler;
        this.authBackend = handler.server.options.authBackend || null;
        this.realm = handler.server.options.realm || "jsDAV";

        handler.addEventListener("beforeMethod", this.beforeMethod.bind(this), AsyncEventEmitter.PRIO_HIGH);
    },

    /**
     * Returns the current users' principal uri.
     *
     * If nobody is logged in, this will return null.
     *
     * @return string|null
     */
    getCurrentUser: function(callback) {
        if (!this.authBackend)
            return callback();
        this.authBackend.getCurrentUser(callback);
    },

    /**
     * This method is called before any HTTP method and forces users to be authenticated
     *
     * @param {String} method
     * @throws Exc.NotAuthenticated
     * @return bool
     */
    beforeMethod: function(e, method) {
        // CORS pre-flight HTTP requests use the OPTIONS method to get the
        // list of allowed origins, methods, headers, etc. We must allow
        // the OPTIONS method through without authentication.
        if (!this.authBackend || this.handler.httpRequest.method == "OPTIONS")
            return e.next();
        this.authBackend.authenticate(this.handler, this.realm, function(err, res) {
            if (err || !res) {
                //do something with response here...
                return err ? e.next(err) : e.stop();
            }
            e.next();
        });
    }
});
