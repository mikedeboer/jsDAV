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
var Util = require("./../../shared/util");
var GnuTools = require("gnu-tools");

var filecount;
var count;
var prevFile;


var IGNORE_DIRS = {
    ".bzr"              : "Bazaar",
    ".cdv"              : "Codeville",
    "~.dep"             : "Interface Builder",
    "~.dot"             : "Interface Builder",
    "~.nib"             : "Interface Builder",
    "~.plst"            : "Interface Builder",
    ".git"              : "Git",
    ".hg"               : "Mercurial",
    ".pc"               : "quilt",
    ".svn"              : "Subversion",
    "_MTN"              : "Monotone",
    "blib"              : "Perl module building",
    "CVS"               : "CVS",
    "RCS"               : "RCS",
    "SCCS"              : "SCCS",
    "_darcs"            : "darcs",
    "_sgbak"            : "Vault/Fortress",
    "autom4te.cache"    : "autoconf",
    "cover_db"          : "Devel::Cover",
    "_build"            : "Module::Build"
};

var MAPPINGS = {
    "actionscript": ["as", "mxml"],
    "ada"         : ["ada", "adb", "ads"],
    "asm"         : ["asm", "s"],
    "batch"       : ["bat", "cmd"],
    //"binary"      : q{Binary files, as defined by Perl's -B op (default: off)},
    "cc"          : ["c", "h", "xs"],
    "cfmx"        : ["cfc", "cfm", "cfml"],
    "clojure"     : ["clj"],
    "cpp"         : ["cpp", "cc", "cxx", "m", "hpp", "hh", "h", "hxx"],
    "csharp"      : ["cs"],
    "css"         : ["css", "less", "scss", "sass"],
    "coffee"      : ["coffee"],
    "elisp"       : ["el"],
    "erlang"      : ["erl", "hrl"],
    "fortran"     : ["f", "f77", "f90", "f95", "f03", "for", "ftn", "fpp"],
    "haskell"     : ["hs", "lhs"],
    "hh"          : ["h"],
    "html"        : ["htm", "html", "shtml", "xhtml"],
    "jade"        : ["jade"],
    "java"        : ["java", "properties"],
    "groovy"      : ["groovy"],
    "js"          : ["js"],
    "json"        : ["json"],
    "latex"       : ["latex", "ltx"],
    "jsp"         : ["jsp", "jspx", "jhtm", "jhtml"],
    "lisp"        : ["lisp", "lsp"],
    "lua"         : ["lua"],
    "make"        : ["makefile", "Makefile"],
    "mason"       : ["mas", "mhtml", "mpl", "mtxt"],
    "markdown"    : ["md", "markdown"],
    "objc"        : ["m", "h"],
    "objcpp"      : ["mm", "h"],
    "ocaml"       : ["ml", "mli"],
    "parrot"      : ["pir", "pasm", "pmc", "ops", "pod", "pg", "tg"],
    "perl"        : ["pl", "pm", "pod", "t"],
    "php"         : ["php", "phpt", "php3", "php4", "php5", "phtml"],
    "plone"       : ["pt", "cpt", "metadata", "cpy", "py"],
    "powershell"  : ["ps1"],
    "python"      : ["py"],
    "rake"        : ["rakefile"],
    "ruby"        : ["rb", "ru", "rhtml", "rjs", "rxml", "erb", "rake", "gemspec"],
    "scala"       : ["scala"],
    "scheme"      : ["scm", "ss"],
    "shell"       : ["sh", "bash", "csh", "tcsh", "ksh", "zsh"],
    //"skipped"     : "q"{"Files but not directories normally skipped by ack ("default": "off")},
    "smalltalk"   : ["st"],
    "sql"         : ["sql", "ctl"],
    "tcl"         : ["tcl", "itcl", "itk"],
    "tex"         : ["tex", "cls", "sty"],
    "text"        : ["txt"],
    "textile"     : ["textile"],
    "tt"          : ["tt", "tt2", "ttml"],
    "vb"          : ["bas", "cls", "frm", "ctl", "vb", "resx"],
    "vim"         : ["vim"],
    "yaml"        : ["yaml", "yml"],
    "xml"         : ["xml", "dtd", "xslt", "ent", "rdf", "rss", "svg", "wsdl", "atom", "mathml", "mml"]
};
var exts = [];
for (var type in MAPPINGS) {
    exts = exts.concat(MAPPINGS[type]);
}
// grep pattern matching for extensions
var PATTERN_EXT = Util.makeUnique(exts).join(",");
var dirs = [];
for (type in IGNORE_DIRS) {
    dirs.push(type);
}
dirs = Util.makeUnique(dirs);
var PATTERN_DIR  = Util.escapeRegExp(dirs.join("|"));
var PATTERN_EDIR = dirs.join(",");
var GREP_CMD = GnuTools.GREP_CMD;
var PERL_CMD = "perl";

var jsDAV_Codesearch_Plugin = module.exports = jsDAV_ServerPlugin.extend({
    IGNORE_DIRS: IGNORE_DIRS,
    MAPPINGS: MAPPINGS,
    PATTERN_EXT: PATTERN_EXT,
    PATTERN_DIR: PATTERN_DIR,
    PATTERN_EDIR: PATTERN_EDIR,
    GREP_CMD: GREP_CMD,
    PERL_CMD: PERL_CMD,

    initialize: function(handler) {
        this.handler = handler;
        handler.addEventListener("report", this.httpReportHandler.bind(this));
    },

    httpReportHandler: function(e, reportName, dom) {
        if (reportName != "{DAV:}codesearch")
            return e.next();
        e.stop();

        filecount = 0;
        count = 0;
        prevFile = null;

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
            self.doCodesearch(node, options, function(sResults) {
                //if (err)
                //    return e.stop(err);
              self.handler.httpResponse.write(sResults);
            }, function(err, sResults) {
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
            if (child.lastChild !== null)
                options[child.localName] = child.lastChild.nodeValue;
        }
        return options;
    },

    doCodesearch: function(node, options, cbwrite, cbend) {
        var cmd = GREP_CMD + " -P -s -r --color=never --binary-files=without-match -n " + ( !Util.isTrue(options.casesensitive) ? "-i" : "" );

        var self  = this;

        var include = "";

        if (!Util.empty(options.pattern)) { // handles grep peculiarities with --include
            if (options.pattern.split(",").length > 1)
                include = "{" + options.pattern + "}";
            else
                include = options.pattern;
        }
        else {
            include = "\\*{" + PATTERN_EXT + "}";
        }

        if (options.maxresults) {
            cmd += "-m " + parseInt(options.maxresults, 10);
        }

        if (Util.isTrue(options.wholeword))
            cmd += " -w";

        var query = options.query;
        // grep has a funny way of handling new lines (that is to say, it's non-existent)
        // if we're not doing a regex search, then we must split everything between the
        // new lines, escape the content, and then smush it back together; due to
        // new lines, this is also why we're now passing -P as default to grep
        if (!Util.isTrue(options.replaceAll) && !Util.isTrue(options.regexp)) {
            var splitQuery = query.split("\\n");

            for (var q in splitQuery) {
                splitQuery[q] = Util.grepEscapeRegExp(splitQuery[q]);
            }
            query = splitQuery.join("\\n");
        }

        query = query.replace(new RegExp("\\\'", "g"), "'\\''"); // ticks must be double escaped for BSD grep

        cmd += " --exclude=*{" + PATTERN_EDIR + "}*"
            +  " --include=" + include
            + " '" + query.replace(/-/g, "\\-") + "'"
            + " \"" + Util.escapeShell(node.path) + "\"";

        if (Util.isTrue(options.replaceAll)) {
            if (options.replacement === undefined)
                options.replacement = "";

            if (!Util.isTrue(options.regexp)) {
                query = Util.escapeRegExp(query);
            }

            // pipe the grep results into perl
            cmd += " -l | xargs " + PERL_CMD +
            // print the grep result to STDOUT (to arrange in parseSearchResult())
            " -pi -e 'print STDOUT \"$ARGV:$.:$_\""     +
            // do the actual replace
            " if s/" + query + "/" + options.replacement + "/mg" + ( !Util.isTrue(options.casesensitive) ? "i" : "" ) + ";'"
        }

        if (jsDAV.debugMode)
            Util.log("search command: " + cmd);

        try {
            this.grep = Spawn("/bin/bash", ["-c", cmd]);
        }
        catch (e) {
            return cbend(null, "Could not spawn grep process");
        }

        var err = "", out = "";

        this.grep.stdout.setEncoding("utf8");
        this.grep.stderr.setEncoding("utf8");
        var buffer = '';

        this.grep.stdout.on("data", function(data) {
            if (!Util.empty(data)) {
                buffer += data;
                if (data.indexOf("\n") !== -1) {
                    if (jsDAV.debugMode)
                        Util.log(data);
                    count += self.parseSearchResult(data, node.path, options, prevFile, cbwrite);
                    buffer = '';
                }
            }
        });
        this.grep.stderr.on("data", function(data) {
            if (!Util.empty(data)) {
                buffer += data;
                if(data.indexOf("\n") !== -1) {
                    count += self.parseSearchResult(data, node.path, options, prevFile, cbwrite);
                    buffer = '';
                }
            }
        });
        this.grep.on("exit", function(code, signal) {
            cbend(null, '\nResults: {"count": '+ count + ', "filecount":' + filecount + '}\n');
        });
    },

    parseSearchResult: function(res, basePath, options, prevFile, cbwrite) {
        var parts, file, lineno, result = "";
        var aLines      = (typeof res == "string" ? res : "").split(/([\n\r]+)/g);
        var i           = 0;
        var count       = 0;
        var l           = aLines.length;

        for (; i < l; ++i) {
            parts = aLines[i].split(":");

            if (parts.length < 3) continue;

            file = encodeURI(options.uri + Util.rtrim(parts.shift().replace(basePath, "")), "/");

            lineno = parseInt(parts.shift(), 10);
            if (!lineno) continue;

            ++count;
            if (file !== prevFile) {
                filecount++;
                if (prevFile)
                    result += "\n\n";
                result += file + ":";
                prevFile = file;
            }

            result += "\n\t" + lineno + ": " + parts.join(":");
        }

        cbwrite(result);

        return count;
    }
});
