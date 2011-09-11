/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV                = require("./../../jsdav"),
    jsDAV_Property       = require("./../property").jsDAV_Property,
    jsDAV_Handler        = require("./../handler"),
    jsDAV_Locks_LockInfo = require("./../plugins/locks/lockinfo").jsDAV_Locks_LockInfo;

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
    this.serialize = function(handler) {
        var xml = "",
            i   = 0,
            l   = this.locks.length;
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
    };
}).call(jsDAV_Property_LockDiscovery.prototype = new jsDAV_Property());
