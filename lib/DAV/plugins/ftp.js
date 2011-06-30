/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Luis Merino <mail AT luismerino DOT name>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
 
var jsDAV_ServerPlugin = require("./../plugin").jsDAV_ServerPlugin;
var Exc = require("../exceptions");

/**
 * Ftp Plugin
 *
 * The purpose of this plugin is to rebase the uri calculation for
 * 'trees' which happen to lack a root node in their listing command(s)
 * this is specially intended for FTP implementations and alike.
 *
 * Also takes care of initializing the FTP server connection, followed by
 * determining the FTP server's time zone with a different between LIST and MDTM
 * FTP commands to reckon the hour difference value.
 */
function jsDAV_Ftp_Plugin(handler) {
    this.handler = handler;
    this.initialize();
}

(function() {
    /** Redefines handler::invoke to delay request handling. This allows any middleware functionality like user authentication and whatnot
      * to be dealt with before the request gets dispatched, giving time to login and prepare the FTP server for ready state.
      * 
      * @throws jsDAV_Exception_Forbidden
      * @return void 
     */
    this.initialize = function() {
        fixRootNodeUri(this.handler);
        
        var tree = this.tree = this.handler.server.tree;
        var conn = tree.ftp;
        
        this.handler.addEventListener("beforeMethod", this.handleState.bind(this));
        
        if (typeof conn == 'undefined' || tree.$ready)
            return;
        
        var oldInvoke = this.handler.invoke,
            self = this,
            args;
        
        this.handler.invoke = function(){
            args = Array.prototype.slice.call(arguments);
        };
        
        this.handler.server.tree.ftp.on('ftp.ready', function(oldInvoke, args) {
            if (!tree.$ready)
                console.info('Ftp connection ready on: '+ conn.options.host);
            tree.$ready = true;
            this.invoke = oldInvoke;
            this.invoke.apply(this, args);
        }.bind(this.handler, oldInvoke, args));
        
        if (!tree.$inited) {
            this.handler.server.tree.ftp.on('ftp.error', function(err) {
                console.error('Ftp connection error on: '+ conn.options.host, err);
                tree.$ready = false;
                self.handler.handleError(new Exc.jsDAV_Exception_Forbidden("Could not establish connection with server on "
                    + conn.options.host +". Please make sure the initial path has the proper permissions and also that your credentials are correct."));
            });
        }
        // Check if auth hasn't started check OR auth hasn't started but connecting has...
        if (conn.$state !== null || tree.$inited)
            return;
            
        tree.$inited = true;
        tree.initialize();
    };
    
    /**
     * This method intercepts requests and queues them to be executed when the next http response ends.
     *
     * @param {Object} e
     * @return void
     */
    this.handleState = function(e) {
        var tree = this.tree;
        if (!tree.$queue) {
            tree.$queue = [];
            e.next();
        } else {
            tree.$queue.push(e.next);
            e.stop();
        }
        var b = this.handler.httpResponse.end;
        this.handler.httpResponse.end = function() {
            var args = Array.prototype.slice.call(arguments);
            if (tree.$queue.length)
                tree.$queue.shift()();
            else
                tree.$queue = null;
            (this.end = b).apply(this, args);
        };
    };

}).call(jsDAV_Ftp_Plugin.prototype = new jsDAV_ServerPlugin());

/** @description
  * Fixes the initial root path is often set as / which in the starting
  * implementation is trimmed from the server's base uri.
  *
  * @params {Object} handler
  * @return void
  */
function fixRootNodeUri(handler) {
    handler.calculateUri = function(uri) {
        if (uri.charAt(0) != "/" && uri.indexOf("://") > -1)
            uri = Url.parse(uri).pathname;

        uri = uri.replace("//", "/");

        if (uri.indexOf(this.server.baseUri) === 0) {
            if (uri === this.server.baseUri) {
                return "/";
            }
            return decodeURI(uri.substr(this.server.baseUri.length));
        }
        // A special case, if the baseUri was accessed without a trailing
        // slash, we'll accept it as well.
        else if (uri + "/" === this.server.baseUri) {
            return "/";
        }
        else {
            throw new Exc.jsDAV_Exception_Forbidden("Requested uri (" + uri
                + ") is out of base uri (" + this.server.baseUri + ")");
        }
    };
}

module.exports = jsDAV_Ftp_Plugin;