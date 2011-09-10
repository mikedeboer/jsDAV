/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
var jsDAV              = require("./../../jsdav"),
    jsDAV_ServerPlugin = require("./../plugin").jsDAV_ServerPlugin,

    Exc  = require("./../exceptions"),
    Util = require("./../util");

/**
 * This plugin provides Authentication for a WebDAV server.
 * 
 * It relies on a Backend object, which provides user information.
 *
 * Additionally, it provides support for:
 *  * {DAV:}current-user-principal property from RFC5397
 *  * {DAV:}principal-collection-set property from RFC3744
 */
function jsDAV_Auth_Plugin(handler) {
    this.handler = handler;
    this.authBackend = handler.server.options.authBackend || null;
    this.realm = handler.server.options.realm || "jsdav";
    this.initialize();
}

(function() {
    /**
     * Authentication backend
     * 
     * @var jsDAV_Auth_Backend_Abstract 
     */
    this.authBackend = null;

    /**
     * The authentication realm. 
     * 
     * @var string 
     */
    this.realm = null;
    
    this.initialize = function() {
        this.handler.addEventListener("beforeMethod", this.beforeMethod.bind(this));
    };
    
    /**
     * Returns the current users' principal uri.
     * 
     * If nobody is logged in, this will return null. 
     * 
     * @return string|null 
     */
    this.getCurrentUser = function(callback) {
        if (!this.authBackend)
            return callback();
        this.authBackend.getCurrentUser(callback);
    };

    /**
     * This method is called before any HTTP method and forces users to be authenticated
     * 
     * @param string method
     * @throws jsDAV_Exception_NotAuthenticated
     * @return bool 
     */
    this.beforeMethod = function(e, method) {
        if (!this.authBackend)
            return e.next();
        this.authBackend.authenticate(this.handler, this.realm, function(err, res) {
            if (!err || res) {
                //do something with response here...
                return e.stop();
            }
            e.next();
        });
    };
}).call(jsDAV_Auth_Plugin.prototype = new jsDAV_ServerPlugin());

module.exports = jsDAV_Auth_Plugin;
