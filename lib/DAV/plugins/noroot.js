/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @author Luis Merino <mail AT luismerino DOT name>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
 
var jsDAV_ServerPlugin = require("./../plugin").jsDAV_ServerPlugin;
var sys = require('sys');

function jsDAV_Noroot_Plugin(handler) {
    
    handler.calculateUri = function(uri) {
        if (uri.charAt(0) != "/" && uri.indexOf("://") > -1)
            uri = Url.parse(uri).pathname;

        uri = uri.replace("//", "/");

        if (uri.indexOf(this.server.baseUri) === 0) {
            return decodeURI(uri.substr(this.server.baseUri.length));
        }
        // A special case, if the baseUri was accessed without a trailing
        // slash, we'll accept it as well.
        else if (uri + "/" === this.server.baseUri) {
            return "";
        }
        else {
            throw new Exc.jsDAV_Exception_Forbidden("Requested uri (" + uri
                + ") is out of base uri (" + this.server.baseUri + ")");
        }
    };
    
}

sys.inherits(jsDAV_Noroot_Plugin, jsDAV_ServerPlugin);

/**
 * No Root Plugin
 *
 * The purpose of this plugin is to rebase the uri calculation for
 * 'trees' which happen to lack a root node in their listing command(s)
 * this is specially intended for FTP implementations and alike.
 *
 * Basically the initial root path is often set as / which in the starting
 * implementation is trimmed from the server's base uri.
 */

module.exports = jsDAV_Noroot_Plugin;