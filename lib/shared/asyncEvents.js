/*
 * @package jsDAV
 * @subpackage shared
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV = require("./../jsdav");

var Util = require("./util");
var Async = require("asyncjs");

exports.EventEmitter = function() {};

exports.EventEmitter.DEFAULT_TIMEOUT = 30000; // in milliseconds
exports.EventEmitter.PRIO_LOW    = 0x0001;
exports.EventEmitter.PRIO_NORMAL = 0x0002;
exports.EventEmitter.PRIO_HIGH   = 0x0004;

var _slice = Array.prototype.slice;

(function() {
    var _ev = exports.EventEmitter;

    function persistRegistry() {
        if (this.$eventRegistry)
            return;
        this.$eventRegistry = {};
        this.$eventRegistry[_ev.PRIO_LOW]    = {};
        this.$eventRegistry[_ev.PRIO_NORMAL] = {};
        this.$eventRegistry[_ev.PRIO_HIGH]   = {};
    }

    function getListeners(eventName) {
        return (this.$eventRegistry[_ev.PRIO_HIGH][eventName] || []).concat(
            this.$eventRegistry[_ev.PRIO_NORMAL][eventName] || []).concat(
            this.$eventRegistry[_ev.PRIO_LOW][eventName] || []);
    }

    this.dispatchEvent = function() {
        persistRegistry.call(this);

        var e,
            returnValue = null,
            args        = _slice.call(arguments),
            eventName   = args.shift().toLowerCase(),
            listeners   = getListeners.call(this, eventName),
            cbdispatch  = (typeof args[args.length - 1] == "function")
                ? args.pop()
                : function(){};
        if (!listeners.length)
            return cbdispatch();

        Async.list(listeners).each(function(listener, cbnext) {
            // If a previous event is still in scope, record the return value.
            // It's OK if the previous value is overwritten, that's just the way
            // event bubbling works.
            if (e)
                returnValue = e.returnValue;
            e = new exports.Event(eventName, cbnext);
            listener.apply(null, [e].concat(args));

            if (listener.$usetimeout > 0) {
                clearTimeout(listener.$timeout);
                listener.$timeout = setTimeout(function() {
                    if (!e.$done) {
                        e.next("Event callback timeout: timeout reached, no callback fired within "
                            + listener.$usetimeout + "ms");
                    }
                }, listener.$usetimeout);
            }
        }).end(function(err) {
            // everything except TRUE as an argument is an error
            if (jsDAV.debugMode && !!err) {
                if (err === true)
                    Util.log("event propagation '" + eventName + "' stopped", "info");
                else
                    Util.log("argument after event '" + eventName + "': {" + typeof err + "} " + err, "error");
            }
            cbdispatch(err, returnValue);
        });
    };

    this.addEventListener = function(eventName, listener, prio, timeout) {
        persistRegistry.call(this);

        // disable timeouts while debugging
        if (jsDAV.debugMode)
            timeout = false;
        listener.$usetimeout = timeout === false
            ? 0
            : (typeof timeout == "number")
                ? timeout
                : exports.EventEmitter.DEFAULT_TIMEOUT;

        eventName = eventName.toLowerCase();
        prio = prio || _ev.PRIO_NORMAL;
        var allListeners = getListeners.call(this, eventName);
        var listeners = this.$eventRegistry[prio][eventName];
        if (!listeners)
            listeners = this.$eventRegistry[prio][eventName] = [];
        if (allListeners.indexOf(listener) === -1)
            listeners.push(listener);
    };

    this.removeEventListener = function(eventName, listener) {
        persistRegistry.call(this);

        eventName = eventName.toLowerCase();
        var _self = this;
        [_ev.PRIO_LOW, _ev.PRIO_NORMAL, _ev.PRIO_HIGH].forEach(function(prio) {
            var listeners = _self.$eventRegistry[prio][eventName];
            if (!listeners)
                return;
            var index = listeners.indexOf(listener);
            if (index !== -1)
                listeners.splice(index, 1);
        });
    };
}).call(exports.EventEmitter.prototype);

exports.Event = function(type, callback) {
    this.$event = true;
    this.$done  = false;
    this.type   = type;
    this.returnValue = null;

    this.next = function(err, ret) {
        if (!Util.empty(ret))
            this.returnValue = ret;
        if (this.$done || !callback)
            return (!callback ? this.$done = true : false);
        this.$done = true;
        callback(err, this.returnValue);
    };

    this.stop = function(ret) {
        return this.next(true, ret);
    };
};
