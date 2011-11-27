/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV              = require("./../../jsdav");
var jsDAV_ServerPlugin = require("./../plugin").jsDAV_ServerPlugin;

var Util  = require("./../util");
var async = require("./../../../support/async.js");

function jsDAV_Filelist_Plugin(handler) {
    this.handler = handler;
    this.initialize();
}

jsDAV_Filelist_Plugin.FIND_CMD = "find";

(function() {
    this.initialize = function() {
        this.handler.addEventListener("report", this.httpReportHandler.bind(this));
    };

    this.httpReportHandler = function(e, reportName, dom) {
        if (reportName != "{DAV:}filelist")
            return e.next();
        //e.stop();

        var uri     = this.handler.getRequestUri();
        var options = this.parseOptions(dom);
        var self    = this;
        options.uri = uri;
        this.handler.server.tree.getNodeForPath(uri, function(err, node) {
            if (err)
                return e.next(err);

            if (jsDAV.debugMode)
                console.log("report" + reportName + ", " + node.path + ", " + require("sys").inspect(options));

            self.doFilelist(node, options, function(err, sResults) {
                if (!Util.empty(err))
                    return e.next(err);
                self.handler.httpResponse.writeHead(207, {"Content-Type":"text/xml; charset=utf-8"});
                self.handler.httpResponse.end(sResults);
                e.stop();
            });
        });
    };

    this.parseOptions = function(dom) {
        var options = {};
        for (var child, i = 0, l = dom.childNodes.length; i < l; ++i) {
            child = dom.childNodes[i];
            if (!child || child.nodeType != 1)
                continue;
            options[child.tagName] = child.nodeValue;
        }
        return options;
    };
    
    this.doFilelist = function(node, options, cbsearch) {
        var self    = this;
        var output  = [];
        var re      = new RegExp("\\.bzr|\\.cdv|\\.dep|\\.dot|\\.nib|\\.plst|\\.git|\\.hg|\\.pc|\\.svn|blib|CVS|RCS|SCCS|_darcs|_sgbak|autom4te\\.cache|cover_db|_build|\\.tmp");
        
        async.walkfiles(node.path, function(item) { return !re.test(item.path); }, async.PREORDER)
            .each(function(item){
                output.push(item.path);
            })
            .end(function(err, res) {
                 cbsearch(err, self.parseSearchResult(output, node.path, options));
            });
    };
    
    this.parseSearchResult = function(res, basePath, options) {
        var namespace, prefix, line;
        var aXml   = ['<?xml version="1.0" encoding="utf-8"?><d:multistatus'];
        var aLines = res;
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
            line = encodeURI(options.uri + Util.rtrim(line.replace(basePath, "")), "/");
            if (line && line !== "")
                aXml.push('<d:href>' + line + '</d:href>');
        }
        return aXml.join("") + '</d:response></d:multistatus>';
    };
}).call(jsDAV_Filelist_Plugin.prototype = new jsDAV_ServerPlugin());

module.exports = jsDAV_Filelist_Plugin;
