/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Luis Merino <mail AT luismerino DOT name>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV_ServerPlugin = require("./../plugin").jsDAV_ServerPlugin;
var Exc = require("../exceptions");
var Util = require("../util");

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
        var tree = this.tree = this.handler.server.tree;

        if (!tree.ftp) // Is FTP jsDav?
            return;

        // Use event to dispatch methods as stateful and make it high priority so this event is dispatched first.
        this.handler.addEventListener(
            "beforeMethod",
            this.handleState.bind(this),
            Util.EventEmitter.PRIO_HIGH,
            10000
        );

        if (tree.ftp.connected && tree.ftp.authenticated)
            return;

        // Once the Ftp server is ready, all instances of handler can be run after being halted
        var oldInvoke = this.handler.invoke;
        var self = this;
        var args;

        this.handler.invoke = function() {
            args = Array.prototype.slice.call(arguments);
        };

        var onReady = function() {
            // Assing old invoke method and call it back.
            this.invoke = oldInvoke;
            this.invoke.apply(this, args);
        }.bind(this.handler);

        // When Ftp server has been initialized, error listener will be assigned, once.
        var onError = function(err) {
            console.log("Ftp connection error on: " + tree.options.host, err);
            self.handler.handleError(
                new Exc.jsDAV_Exception_Forbidden(
                    "Could not establish connection with server on "
                    + tree.options.host
                    + ". Please make sure the initial path has the proper "
                    + "permissions and also that your credentials are correct."
                )
            );
        };

        tree.initialize(onReady, onError);
    };

    /**
     * This method intercepts requests and queues them to be executed when the next http response ends.
     *
     * @param {Object} e
     * @return void
     */
    this.handleState = function(e, method) {
        var tree = this.tree;

        if (!tree.$line)
            tree.$line = [];
        else
            tree.$line.push(e);

        var end = this.handler.httpResponse.end;
        this.handler.httpResponse.end = function() {
            if (tree.$line.length)
                tree.$line.shift().next(); // call next
            else
                tree.$line = null;

            this.end = end;
            this.end.apply(this, Array.prototype.slice.call(arguments));
        };

        if (!tree.$line.length)
            e.next();
    };

}).call(jsDAV_Ftp_Plugin.prototype = new jsDAV_ServerPlugin());

module.exports = jsDAV_Ftp_Plugin;

