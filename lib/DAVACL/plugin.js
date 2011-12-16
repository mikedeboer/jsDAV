/*
 * @package jsDAV
 * @subpackage DAVACL
 * @copyright Copyright(c) 2011 Tri Tech Computers Ltd. <info AT tri-tech DOT com>
 * @author James Emerton <james AT tri-tech DOT com>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var Async = require("./../../support/async.js");

var jsDAV_ServerPlugin = require("./../DAV/plugin").jsDAV_ServerPlugin;

var jsDAV_Property_Princpal = require("./property/principal").jsDAV_Property_Princpal;


function jsDAV_DAVACL_Plugin(handler) {
    this.handler = handler;

    handler.addEventListener("beforeGetProperties", this.beforeGetProperties.bind(this));
}

(function() {
    /**
     * This string is prepended to the username of the currently logged in
     * user. This allows the plugin to determine the principal path based on
     * the username.
     *
     * @var string
     */
    this.defaultUsernamePath = 'principals';
    
    /**
     * Returns the standard users' principal.
     *
     * This is one authorative principal url for the current user.
     * This method will return null if the user wasn't logged in.
     *
     * @return string|null
     */
    this.getCurrentUserPrincipal = function() {
        var authPlugin = this.handler.plugins['auth'];
        if(authPlugin === undefined) return null;

        var user = authPlugin.getCurrentUser();
        return (user ? this.defaultUsernamePath+'/'+user : null);
    }
    
    this.beforeGetProperties = function(e, path, node, propertyNames, newProperties) {
        var self = this;
        Async.list(propertyNames)
            .each(function(prop, cbnextprop) {
                switch(prop) {
                    case "{DAV:}current-user-principal":
                        var user = self.getCurrentUserPrincipal();
                        if(user) {
                            newProperties["200"][prop] = new jsDAV_Property_Princpal(
                                jsDAV_Property_Princpal.HREF, user);
                        }
                        else {
                            newProperties["200"][prop] = new jsDAV_Property_Princpal(
                                jsDAV_Property_Princpal.UNAUTHENTICATED);
                        }
                        break;
                }

                cbnextprop();
            })
            .end(e.next.bind(e));
    }
}).call(jsDAV_DAVACL_Plugin.prototype = new jsDAV_ServerPlugin());

module.exports = jsDAV_DAVACL_Plugin;