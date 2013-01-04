/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_Property = require("./../property");
var jsDAV_Handler = require("./../handler");
var jsDAV_Locks_LockInfo = require("./../plugins/locks/lockinfo");

var jsDAV_Property_LockDiscovery = module.exports = jsDAV_Property.extend({
    /**
     * locks
     *
     * @var array
     */
    locks: [],

    /**
     * Should we show the locktoken as well?
     *
     * @var bool
     */
    revealLockToken: false,

    initialize: function(locks, revealLockToken) {
        this.locks           = locks || [];
        this.revealLockToken = revealLockToken || false;
    },

    /**
     * serialize
     *
     * @param DOMElement prop
     * @return void
     */
    serialize: function(handler) {
        var lock;
        var xml = "";
        var i   = 0;
        var l   = this.locks.length;
        for (; i < l; ++i) {
            lock = this.locks[i];

            xml += "<d:activelock>"
                 +     "<d:lockscope>"
                 +         "<d:" + (lock.scope == jsDAV_Locks_LockInfo.EXCLUSIVE ? "exclusive" : "shared") + "/>"
                 +     "</d:lockscope>"
                 +     "<d:locktype>"
                 +         "<d:write/>"
                 +     "</d:locktype>"
                 +     "<d:depth>" + (lock.depth == jsDAV_Handler.DEPTH_INFINITY ? "infinity" : lock.depth) + "</d:depth>"
                 +     "<d:timeout>" + ("Second-" + lock.timeout) + "</d:timeout>";

            if (this.revealLockToken) {
                xml += "<d:locktoken>"
                     +     "<d:href>" + ("opaquelocktoken:" + lock.token) + "</d:href>"
                     +  "</d:locktoken>";
            }

            xml += "<d:owner>" + lock.owner + "</d:owner></d:activelock>";
        }
        return xml;
    }
});
