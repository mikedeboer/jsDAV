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

var Spawn = require("child_process").spawn;
var Util  = require("./../../shared/util");
var GnuTools = require("gnu-tools");
var platform = require("os").platform();

var jsDAV_Filelist_Plugin = module.exports = jsDAV_ServerPlugin.extend({
    FIND_CMD: GnuTools.FIND_CMD,

    initialize: function(handler) {
        this.handler = handler;
        handler.addEventListener("report", this.httpReportHandler.bind(this));
    },

    httpReportHandler: function(e, reportName, dom) {
        if (reportName != "{DAV:}filelist")
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

            self.handler.httpResponse.writeHead(207, {"Content-Type":"text/xml; charset=utf-8"});

            self.doFilelist(node, options, function(err, sResults) {
                if (!Util.empty(err))
                    return e.stop(err);
                self.handler.httpResponse.write(sResults);
            }, function(err) {
                self.handler.httpResponse.end();
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

    doFilelist: function(node, options, cbsearch, cbend) {
        var excludeExtensions = [
            //File Extensions
            "\\.gz", "\\.bzr", "\\.cdv", "\\.dep", "\\.dot", "\\.nib",
            "\\.plst", "_darcs", "_sgbak", "autom4te\\.cache", "cover_db",
            "_build", "\\.tmp"
        ];

        var excludeDirectories = [
            //Directories
            "\\.c9revisions", "\\.architect", "\\.sourcemint",
            "\\.git", "\\.hg", "\\.pc", "\\.svn", "blib",
            "CVS", "RCS", "SCCS", "\.DS_Store"
        ];


        var args = ["-L", ".", "-type", "f", "-a"];

        if (platform === "darwin")
            args.unshift("-E");

        //Hidden Files
        if (options.showHiddenFiles == "1")
            args.push("!", "-regex", "\\/\\.[^\\/]*$");

        if (options.maxdepth)
            args.push("-maxdepth", options.maxdepth);

        excludeExtensions.forEach(function(pattern){
            args.push("!", "-regex", ".*\\/" + pattern + "$");
        });

        excludeDirectories.forEach(function(pattern){
            args.push("!", "-regex", ".*\\/" + pattern + "\\/.*");
        });

        if (platform !== "darwin")
            args.push("-regextype", "posix-extended", "-print");

        if (jsDAV.debugMode)
            Util.log("search command: " + jsDAV_Filelist_Plugin.FIND_CMD + args.join(" "));

        var find = Spawn(jsDAV_Filelist_Plugin.FIND_CMD, args, {
            cwd: node.path
        });
        find.stdout.on("data", function(data) {
            if (!Util.empty(data))
                cbsearch(false, data);
        });
        find.stderr.on("data", function(data) {
            if (!Util.empty(data))
                cbsearch(data);
        });
        find.on("exit", function(code) {
            cbend(null, code);
        });
    }
});
