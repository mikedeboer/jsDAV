/*
 * @package jsDAV
 * @subpackage CardDAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_Plugin = require("./../DAV/plugin");
var jsCardDAV_Plugin = require("./plugin");
var jsCardDAV_iAddressBook = require("./interfaces/iAddressBook");
var jsVObject_Reader = require("./../VObject/reader");

var Exc = require("./../shared/exceptions");
var Util = require("./../shared/util");

var Url = require("url");

/**
 * VCF Exporter
 *
 * This plugin adds the ability to export entire address books as .vcf files.
 * This is useful for clients that don't support CardDAV yet. They often do
 * support vcf files.
 */
var jsCardDAV_VCFExportPlugin = module.exports = jsDAV_Plugin.extend({
    /**
     * Reference to Handler class
     *
     * @var jsDAV_Handler
     */
    handler: null,

    /**
     * Initializes the plugin and registers event handlers
     *
     * @param jsDAV_Handler handler
     * @return void
     */
    initialize: function(handler) {
        this.handler = handler;
        this.handler.addEventListener("beforeMethod", this.beforeMethod.bind(this));
    },

    /**
     * 'beforeMethod' event handles. This event handles intercepts GET requests ending
     * with ?export
     *
     * @param {String} method
     * @param {String} uri
     * @return bool
     */
    beforeMethod: function(e, method, uri) {
        if (method != "GET")
            return e.next();
        
        var parsedUrl = Url.parse(this.handler.httpRequest.url, true);
        if (!("export" in parsedUrl.query))
            return e.next();

        // splitting uri
        uri = uri.split("?")[0]
        
        var self = this;
        this.handler.getNodeForPath(uri, function(err, node) {
            if (err)
                return e.next(err);
            if (!node.hasFeature(jsCardDAV_iAddressBook))
                return e.next();
    
            // Checking ACL, if available.
            var aclPlugin = self.handler.plugins.acl;
            if (aclPlugin) {
                aclPlugin.checkPrivileges(uri, "{DAV:}read", null, function(err, hasPriv) {
                    if (err)
                        return e.next(err);
                    afterAcl();
                });
            }
            else
                afterAcl();
            
            function afterAcl() {
        
                self.handler.getPropertiesForPath(uri, ["{" + jsCardDAV_Plugin.NS_CARDDAV + "}address-data"], 1, function(err, nodes) {
                    if (err)
                        return e.next(err);
                    
                    // e.stop() to break the event chain
                    e.stop();
                    self.handler.httpResponse.writeHead(200, {"content-type": "text/directory"});
                    self.handler.httpResponse.end(self.generateVCF(nodes));
                });
            }
        });
    },

    /**
     * Merges all vcard objects, and builds one big vcf export
     *
     * @param {Array} nodes
     * @return string
     */
    generateVCF: function(nodes) {
        var output = [];

        for (var node, nodeData, i = 0, l = nodes.length; i < l; ++i) {
            node = nodes[i];

            if (node["200"]["{" + jsCardDAV_Plugin.NS_CARDDAV + "}address-data"])
                continue;

            nodeData = node["200"]["{" + jsCardDAV_Plugin.NS_CARDDAV + "}address-data"];

            // Parsing this node so VObject can clean up the output.
            output.push(jsVObject_Reader.new().read(nodeData).serialize());
        }
        
        return output.join("");
    }
});
