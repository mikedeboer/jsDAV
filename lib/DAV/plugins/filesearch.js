/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
var jsDAV                   = require("./../../jsdav"),
    jsDAV_ServerPlugin      = require("./../plugin").jsDAV_ServerPlugin,
    jsDAV_Codesearch_Plugin = require("./codesearch"),

    Spawn = require("child_process").spawn,
    Exc   = require("./../exceptions"),
    Util  = require("./../util");

function jsDAV_Filesearch_Plugin(handler) {
    this.handler = handler;
    this.initialize();
}

jsDAV_Filesearch_Plugin.FIND_CMD = "find";

(function() {
    this.initialize = function() {
        this.handler.addEventListener("report", this.httpReportHandler.bind(this));
    };

    this.httpReportHandler = function(e, reportName, dom) {
        if (reportName != "{DAV:}filesearch")
            return e.next();
        e.stop();

        var uri     = this.handler.getRequestUri(),
            options = this.parseOptions(dom),
            _self   = this;
        options.uri = uri;
        this.handler.server.tree.getNodeForPath(uri, function(err, node) {
            if (err)
                return e.next(err);

            if (jsDAV.debugMode)
                console.log("report" + reportName + ", " + node.path + ", " + require("sys").inspect(options));

            _self.doFilesearch(node, options, function(err, sResults) {
                if (!Util.empty(err))
                    return e.stop(err);
                _self.handler.httpResponse.writeHead(207, {"Content-Type":"text/xml; charset=utf-8"});
                _self.handler.httpResponse.end(sResults);
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

    this.doFilesearch = function(node, options, cbsearch) {
        var args,
            _self = this;
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
            console.log("search command: find " + args.join(" "));
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
            cbsearch(err, _self.parseSearchResult(out || "", node.path, options));
        });
    };

    this.parseSearchResult = function(res, basePath, options) {
        var namespace, prefix, lastFile, line,
            aXml   = ['<?xml version="1.0" encoding="utf-8"?><d:multistatus'],
            aLines = res.split("\n"),
            i      = 0,
            l      = aLines.length;
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
    };
}).call(jsDAV_Filesearch_Plugin.prototype = new jsDAV_ServerPlugin());

module.exports = jsDAV_Filesearch_Plugin;
