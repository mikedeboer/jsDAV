/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_ServerPlugin = require("./../plugin");

var Util = require("./../../shared/util");

/**
 * This plugin provides support for RFC4709: Mounting WebDAV servers
 *
 * Simply append ?mount to any collection to generate the davmount response.
 */
var jsDAV_Mount_Plugin = module.exports = jsDAV_ServerPlugin.extend({
    initialize: function(handler) {
        this.handler = handler;
        this.handler.addEventListener("beforeMethod", this.beforeMethod.bind(this));
    },

    /**
     * 'beforeMethod' event handles. This event handles intercepts GET requests ending
     * with ?mount
     *
     * @param string method
     * @return void
     */
    beforeMethod: function(e, method) {
        if (method != "GET" || this.handler.httpRequest.url.indexOf("?mount") === -1)
            return e.next();

        var currentUri = this.handler.getRequestUri();

        // Stripping off everything after the ?
        currentUri = currentUri.replace(/\?.*$/, "");

        this.davMount(e, currentUri);

        // Break the event chain
        e.stop();
    },

    /**
     * Generates the davmount response
     *
     * @param string uri absolute uri
     * @return void
     */
    davMount: function(uri) {
        var res = this.handler.httpResponse;
        res.writeHead(200, {"Content-Type": "application/davmount+xml"});
        res.end("<?xml version=\"1.0\"?>\n"
              + "<dm:mount xmlns:dm=\"http://purl.org/NET/webdav/mount\">\n"
              + "  <dm:url>" + Util.escapeXml(uri) + "</dm:url>\n"
              + "</dm:mount>"
        );
    }
});
