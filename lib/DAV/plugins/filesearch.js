/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV = require("./../../jsdav");
var jsDAV_ServerPlugin = require("./../plugin");
var jsDAV_Codesearch_Plugin = require("./codesearch");

var Spawn = require("child_process").spawn;
var Util = require("./../../shared/util");
var GnuTools = require("gnu-tools");

var jsDAV_Filesearch_Plugin = module.exports = jsDAV_ServerPlugin.extend({
    FIND_CMD: GnuTools.FIND_CMD,

    initialize: function(handler) {
        this.handler = handler;
        handler.addEventListener("report", this.httpReportHandler.bind(this));
    },

    httpReportHandler: function(e, reportName, dom) {
        if (reportName != "{DAV:}filesearch")
            return e.next();
        e.stop();

        var uri     = this.handler.getRequestUri();
        var options = this.parseOptions(dom);
        var self    = this;
        options.uri = uri;
        this.handler.getNodeForPath(uri, function(err, node) {
            if (err)
                return e.next(err);

            if (jsDAV.debugMode)
                Util.log("report" + reportName + ", " + node.path + ", ", options);

            self.doFilesearch(node, options, function(err, sResults) {
                if (!Util.empty(err))
                    return e.stop(err);
                self.handler.httpResponse.writeHead(207, {"Content-Type":"text/xml; charset=utf-8"});
                self.handler.httpResponse.end(sResults);
                e.stop();
            });
        });
    },

    parseOptions: function(dom) {
        var options = {};
        for (var child, i = 0, l = dom.childNodes.length; i < l; ++i) {
            child = dom.childNodes[i];
            if (!child || child.nodeType != 1)
                continue;
            options[child.tagName] = child.nodeValue;
        }
        return options;
    },

    doFilesearch: function(node, options, cbsearch) {
        var args;
        var self = this;
        if (process.platform == "darwin") {
            // BSD find
            args = ["-L", "-E", node.path, "-type", "f", "(", "-iname",
                     options.query + "*", "-a", "!", "-regex",
                     ".*(" + jsDAV_Codesearch_Plugin.PATTERN_DIR + ").*", ")",
                     "-print"];
        }
        else {
            // GNU find
            args = ["-L", node.path, "-type", "f", "-iname", options.query + "*",
                    "-a", "!", "-regex", ".*(" + jsDAV_Codesearch_Plugin.PATTERN_DIR + ").*",
                    "-regextype", "posix-extended", "-print"];
        }
        if (jsDAV.debugMode)
            Util.log("search command: find " + args.join(" "));
        var err  = "",
            out  = "",
            find = Spawn(jsDAV_Filesearch_Plugin.FIND_CMD, args);
        find.stdout.on("data", function(data) {
            if (!Util.empty(data))
                out += data;
        });
        find.stderr.on("data", function(data) {
            if (!Util.empty(data))
                err += data;
        });
        find.on("exit", function(code) {
            cbsearch(err, self.parseSearchResult(out || "", node.path, options));
        });
    },

    parseSearchResult: function(res, basePath, options) {
        var namespace, prefix, lastFile, line;
        var aXml   = ['<?xml version="1.0" encoding="utf-8"?><d:multistatus'];
        var aLines = res.split("\n");
        var i      = 0;
        var l      = aLines.length;
        // Adding in default namespaces
        for (namespace in this.handler.xmlNamespaces) {
            prefix = this.handler.xmlNamespaces[namespace];
            aXml.push(' xmlns:' + prefix + '="' + namespace + '"');
        }
        aXml.push('><d:response query="', Util.escapeXml(options.query, '"'), '">');
        for (; i < l; ++i) {
            line = Util.trim(aLines[i]);
            if (!line) continue;
            aXml.push('<d:href>' + encodeURI(options.uri
                + Util.rtrim(line.replace(basePath, "")), "/")
                + '</d:href>');
        }
        return aXml.join("") + '</d:response></d:multistatus>';
    }
});
