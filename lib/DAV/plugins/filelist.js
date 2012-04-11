/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV                   = require("./../../jsdav");
var jsDAV_ServerPlugin      = require("./../plugin").jsDAV_ServerPlugin;
var jsDAV_Codesearch_Plugin = require("./codesearch");

var Spawn = require("child_process").spawn;
var Util  = require("./../util");

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
        e.stop();

        var uri     = this.handler.getRequestUri();
        var options = this.parseOptions(dom);
        var self    = this;
        options.uri = uri;
        this.handler.server.tree.getNodeForPath(uri, function(err, node) {
            if (err)
                return e.next(err);

            if (jsDAV.debugMode)
                Util.log("report" + reportName + ", " + node.path + ", ", options);

            self.doFilelist(node, options, function(err, sResults) {
                if (!Util.empty(err))
                    return e.stop(err);
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
        var excludePattern = 
            (options.showHiddenFiles == "1" ? "" : "\\/\\.[^\\/]*$|") //Hidden Files
            + ".*(\\.gz|\\.bzr|\\.cdv|\\.dep|\\.dot|\\.nib|\\.plst|_darcs|_sgbak|autom4te\\.cache|cover_db|_build|\\.tmp)$" //File Extensions
            + "|.*\\/(\\.git|\\.hg|\\.pc|\\.svn|blib|CVS|RCS|SCCS|\.DS_Store)(\\/.*|$)"; //File Names
        
        var args;
        var self = this;
        if (process.platform == "darwin") {
            // BSD find
            args = ["-L", "-E", ".", "-type", "f", "(", 
                     "-a", "!", "-regex",
                     excludePattern, ")",
                     "-print"];
        }
        else {
            // GNU find
            args = ["-L", ".", "-type", "f",
                    "-a", "!", "-regex", excludePattern,
                    "-regextype", "posix-extended", "-print"];
        }
        if (jsDAV.debugMode)
            Util.log("search command: find " + args.join(" "));
        var err  = "",
            out  = "",
            find = Spawn(jsDAV_Filelist_Plugin.FIND_CMD, args, {
                cwd: node.path
            });
        find.stdout.on("data", function(data) {
            if (!Util.empty(data))
                out += data;
        });
        find.stderr.on("data", function(data) {
            if (!Util.empty(data))
                err += data;
        });
        find.on("exit", function(code) {
            cbsearch(err, out);
            console.log("done");
        });
    };
}).call(jsDAV_Filelist_Plugin.prototype = new jsDAV_ServerPlugin());

module.exports = jsDAV_Filelist_Plugin;
