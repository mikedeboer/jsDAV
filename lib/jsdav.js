/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

exports.debugMode = false;

exports.__INODE__                   = 1 << 2;
exports.__ICOLLECTION__             = 1 << 3;
exports.__IEXTCOLLECTION__          = 1 << 4;
exports.__IDIRECTORY__              = 1 << 5;
exports.__IFILE__                   = 1 << 6;
exports.__ILOCKABLE__               = 1 << 7;
exports.__IPROPERTIES__             = 1 << 8;
exports.__IQUOTA__                  = 1 << 9;
exports.__NODE__                    = 1 << 10;
exports.__OBJECTTREE__              = 1 << 11;
exports.__PROPERTY__                = 1 << 12;
exports.__SIMPLEDIR__               = 1 << 13;
exports.__TREE__                    = 1 << 14;
exports.__LOCKINFO__                = 1 << 15;
exports.__PLUGIN__                  = 1 << 16;
exports.__PROP_GETLASTMODIFIED__    = 1 << 17;
exports.__PROP_HREF__               = 1 << 18;
exports.__PROP_IHREF__              = 1 << 19;
exports.__PROP_LOCKDISCOVERY__      = 1 << 20;
exports.__PROP_PRINCIPAL__          = 1 << 21;
exports.__PROP_RESOURCETYPE__       = 1 << 22;
exports.__PROP_RESPONSE__           = 1 << 23;
exports.__PROP_SUPPORTEDLOCK__      = 1 << 24;
exports.__PROP_SUPPORTEDREPORTSET__ = 1 << 25;


exports.jsDAV_Base = function() {};

(function() {
    this.REGBASE = 0;

    this.hasFeature = function(test){
        return this.REGBASE & test;
    };

    /**
     * This method implements all properties and methods to this object from
     * another class
     *
     * @param {Function}    classRef    Class reference
     */
    this.implement = function(classRef) {
        // for speed, we check for the most common case first
        if (arguments.length == 1) {
            if (!classRef)
                throw new Error("Could not implement from '" + classRef[i] + "'");
            classRef.call(this);
        }
        else {
            for (var a, i = 0, l = arguments.length; i < l; ++i) {
                a = arguments[i];
                if (!a)
                    throw new Error("Could not implement from '" + arguments[i] + "'");
                arguments[i].call(this);//classRef
            }
        }
        return this;
    };
}).call(exports.jsDAV_Base.prototype);

exports.createServer = function(options, port, host) {
    var DAV = require("./DAV/server");
    DAV.debugMode = exports.debugMode;
    return DAV.createServer(options, port, host);
};

/**
 * Create a jsDAV Server object that will not fire up listening to HTTP requests,
 * but instead will respond to requests that are passed to 
 * 1) the custom NodeJS httpServer provided by the 'server' option or
 * 2) the Server.handle() function.
 * 
 * @param {Object} options Options to be passed to the jsDAV Server object, which
 *                         should look like:
 * [code]
 * {
 *     node      : path,
 *     mount     : mountpoint,
 *     server    : server,
 *     standalone: standalone
 * }
 * [/code]
 */
exports.mount = function(options) {
    var DAV = require("./DAV/server");
    DAV.debugMode = exports.debugMode;
    return DAV.mount(options);
};

//@todo implement CalDAV
exports.createCalDAVServer = function(options, port, host) {
    var CalDAV = require("./CalDAV/server");
    CalDAV.debugMode = exports.debugMode;
    return CalDAV.createServer(options, port, host);
};
