/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author William J Edney <bedney AT technicalpursuit DOT com>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_ServerPlugin = require("./../plugin");

var jsDAV = require("./../../jsdav");

var Util  = require("./../../shared/util");

/**
 * This plugin provides support for CORS headers.
 *
 * Note that this plugin provides VERY permissive support for CORS. All
 * standard HTTP headers and any requested 'x-' headers during preflight are
 * allowed, as well as all methods from the core HTTP standard and various
 * WebDAV standards.
 *
 * NOTE: This code based heavily on code from John J. Barton.
 */
var jsDAV_CORS_Plugin = module.exports = jsDAV_ServerPlugin.extend({
    /**
     * Plugin name
     *
     * @var String
     */
    name: "cors",

    initialize: function(handler) {
        this.handler = handler;
        this.handler.addEventListener("beforeMethod", this.beforeMethod.bind(this));
    },

    beforeMethod: function(e, method) {
        this.addCORSHeaders(this.handler.httpRequest, this.handler.httpResponse);

        return e.next();
    },

    addCORSHeaders: function(req, resp) {
        var headers = this.computeCORSHeaders(req);

        if (jsDAV.debugMode) {
            Util.log("Receiving headers: " + JSON.stringify(req.headers));
            Util.log("Returning headers: " + JSON.stringify(headers));
        }

        Object.keys(headers).forEach(function(headerName) {
            resp.setHeader(headerName, headers[headerName]);  
        });
    },

    computeCORSHeaders: function(req) {
        var allowedHeaders = this.accessControlAllowHeaders(req);
        var allowedOrigins = req.headers.origin || '*';

        var headers = {
            "Access-Control-Allow-Methods": 
                //  All verbs from HTTP
                "GET, HEAD, PUT, POST, DELETE, TRACE, OPTIONS, CONNECT, " +
                //  PATCH from RFC 5789
                "PATCH, " +
                //  All verbs from WebDAV core (RFC 4918)
                "PROPFIND, PROPPATCH, MKCOL, COPY, MOVE, LOCK, UNLOCK, " +
                //  All verbs from DeltaV extensions to WebDAV core (RFC 3253)
                "VERSION-CONTROL, REPORT, CHECKOUT, CHECKIN, UNCHECKOUT, MKWORKSPACE, UPDATE, LABEL, MERGE, BASELINE-CONTROL, MKACTIVITY, " +
                //  Microsoft WebDAV extension
                "GETLIB",

            "Access-Control-Max-Age": "86400",
            "Access-Control-Allow-Headers": allowedHeaders,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Origin": allowedOrigins,
        };

        return headers;
    },

    accessControlAllowHeaders: function(req) {
        //  HTTP headers are case-insensitive...
        var reqHeaders = req.headers["Access-Control-Request-Headers"] ||
                         req.headers["access-control-request-headers"];

        if (reqHeaders) {
            // Just tell the client what it wants to hear
            return reqHeaders;
        }
        else {
            // or tell it everything we know about plus any x- headers it sends
            return Object.keys(req.headers).reduce(
                function(headers, header) {
                    if (header.indexOf("x-") === 0) {
                        headers += "," + header;
                    }
                    return headers;
                },
                this.defaultAccessControlAllowHeaders);
        }
    },

    defaultAccessControlAllowHeaders: [
        "accept",
        "accept-charset",
        "accept-encoding",
        "accept-language",
        "authorization",
        "content-length",
        "content-type",
        "host",
        "origin",
        "proxy-connection",
        "referer",
        "user-agent",
        "x-requested-with"
    ]
});
