/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV                = require("./../../jsdav"),
    jsDAV_Property       = require("./../property").jsDAV_Property,
    jsDAV_Handler        = require("./../handler").jsDAV_Server,
    jsDAV_Locks_LockInfo = require("./../plugins/locks/lockInfo").jsDAV_Locks_LockInfo;

function jsDAV_Property_LockDiscovery(locks, revealLockToken) {
    this.locks           = locks || [];
    this.revealLockToken = revealLockToken || false;
}

exports.jsDAV_Property_LockDiscovery = jsDAV_Property_LockDiscovery;

(function() {
    this.REGBASE = this.REGBASE | jsDAV.__PROP_LOCKDISCOVERY__;

    /**
     * locks
     *
     * @var array
     */
    this.locks = [];

    /**
     * Should we show the locktoken as well?
     *
     * @var bool
     */
    this.revealLockToken = false;

    /**
     * serialize
     *
     * @param DOMElement prop
     * @return void
     */
    this.serialize = function(handler, prop) {
        var lock,
            i = 0,
            l = this.locks.length;
        for (; i < l; ++i) {
            lock = this.locks[i];

            prop += "<d:activelock>"
                 +     "<d:lockscope>"
                 +         "<d:" + (lock.scope == jsDAV_Locks_LockInfo.EXCLUSIVE ? "exclusive" : "shared") + "/>"
                 +     "</d:lockscope>"
                 +     "<d:locktype>"
                 +         "<d:write/>"
                 +     "</d:locktype>"
                 +     "<d:depth>" + (lock.depth == jsDAV_Handler.DEPTH_INFINITY ? "infinity" : lock.depth) + "</d:depth>"
                 +     "<d:timeout>" + ("Second-" + lock.timeout) + "</d:timeout>";

            if (this.revealLockToken) {
                prop += "<d:locktoken>"
                     +     "<d:href>" + ("opaquelocktoken:" + lock.token) + "</d:href>"
                     +  "</d:locktoken>";
            }

            prop += "<d:owner>" + lock.owner + "</d:owner></d:activelock>";
        }
        return prop;
    };
}).call(jsDAV_Property_LockDiscovery.prototype = new jsDAV_Property());
