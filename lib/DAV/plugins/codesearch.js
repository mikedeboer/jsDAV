/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
var jsDAV              = require("./../../jsdav"),
    jsDAV_ServerPlugin = require("./../plugin").jsDAV_ServerPlugin,

    Exc  = require("./../exceptions"),
    Util = require("./../util");

function jsDAV_Codesearch_Plugin(handler) {
    this.handler = handler;
    this.initialize();
}

jsDAV_Codesearch_Plugin.IGNORE_DIRS = {
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
jsDAV_Codesearch_Plugin.MAPPINGS = {
    "actionscript": ["as", "mxml"],
    "ada"         : ["ada", "adb", "ads"],
    "asm"         : ["asm", "s"],
    "batch"       : ["bat", "cmd"],
    //"binary"      : q{Binary files, as defined by Perl's -B op (default: off)},
    "cc"          : ["c", "h", "xs"],
    "cfmx"        : ["cfc", "cfm", "cfml"],
    "cpp"         : ["cpp", "cc", "cxx", "m", "hpp", "hh", "h", "hxx"],
    "csharp"      : ["cs"],
    "css"         : ["css"],
    "elisp"       : ["el"],
    "erlang"      : ["erl", "hrl"],
    "fortran"     : ["f", "f77", "f90", "f95", "f03", "for", "ftn", "fpp"],
    "haskell"     : ["hs", "lhs"],
    "hh"          : ["h"],
    "html"        : ["htm", "html", "shtml", "xhtml"],
    "java"        : ["java", "properties"],
    "js"          : ["js"],
    "jsp"         : ["jsp", "jspx", "jhtm", "jhtml"],
    "lisp"        : ["lisp", "lsp"],
    "lua"         : ["lua"],
    "make"        : ["makefile"],
    "mason"       : ["mas", "mhtml", "mpl", "mtxt"],
    "objc"        : ["m", "h"],
    "objcpp"      : ["mm", "h"],
    "ocaml"       : ["ml", "mli"],
    "parrot"      : ["pir", "pasm", "pmc", "ops", "pod", "pg", "tg"],
    "perl"        : ["pl", "pm", "pod", "t"],
    "php"         : ["php", "phpt", "php3", "php4", "php5", "phtml"],
    "plone"       : ["pt", "cpt", "metadata", "cpy", "py"],
    "python"      : ["py"],
    "rake"        : ["rakefile"],
    "ruby"        : ["rb", "rhtml", "rjs", "rxml", "erb", "rake"],
    "scala"       : ["scala"],
    "scheme"      : ["scm", "ss"],
    "shell"       : ["sh", "bash", "csh", "tcsh", "ksh", "zsh"],
    //"skipped"     : "q"{"Files", "but", "not", "directories", "normally", "skipped", "by", "ack" ("default": "off")},
    "smalltalk"   : ["st"],
    "sql"         : ["sql", "ctl"],
    "tcl"         : ["tcl", "itcl", "itk"],
    "tex"         : ["tex", "cls", "sty"],
    "text"        : ["txt"],
    "tt"          : ["tt", "tt2", "ttml"],
    "vb"          : ["bas", "cls", "frm", "ctl", "vb", "resx"],
    "vim"         : ["vim"],
    "yaml"        : ["yaml", "yml"],
    "xml"         : ["xml", "dtd", "xslt", "ent"]
};
var exts = [];
for (var type in jsDAV_Codesearch_Plugin.MAPPINGS) {
    exts = exts.concat(jsDAV_Codesearch_Plugin.MAPPINGS[type]);
}
jsDAV_Codesearch_Plugin.PATTERN_EXT = "\\." + Util.makeUnique(exts).join("|\\.");
var dirs = [];
for (type in jsDAV_Codesearch_Plugin.IGNORE_DIRS) {
    dirs.push(Util.escapeRegExp(type));
}
jsDAV_Codesearch_Plugin.PATTERN_DIR = Util.makeUnique(dirs).join("|");

(function() {
    this.initialize = function() {
        this.handler.addEventListener("report", this.httpReportHandler.bind(this));
    };

    this.httpReportHandler = function(e, reportName, dom) {
        if (reportName != "{DAV:}codesearch")
            return next();
        e.stop();

        var uri     = this.handler.getRequestUri(),
            options = this.parseOptions(dom),
            _self   = this;
        this.handler.server.tree.getNodeForPath(uri, function(err, node) {
            if (err)
                return e.next(err);

            console.log("report" + reportName + ", " + node.path + ", " + require("sys").inspect(options));

            _self.doCodesearch(node, options, function(err, sResults) {
                if (err)
                    return e.stop(err);
                _self.handler.httpResponse.writeHead(200, {"Content-Type":"text/html; charset=utf-8"});
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

    this.doCodesearch = function(node, options, cbsearch) {
        var cmd = "grep -P -s -r";
        if (Util.isTrue(options.ignorecase))
            cmd += " -i"
        if (options.maxresults)
            cmd += " -m " + options.maxresults;
        if (Util.isFalse(options.showlinenumber))
            cmd += " -n";
        cmd += " --exclude='(" + jsDAV_Codesearch_Plugin.PATTERN_DIR + ")|("
            +  jsDAV_Codesearch_Plugin.PATTERN_EXT + ")'"
            +  " '" + Util.escapeRegExp(options.query) + "' '" + node.path + "'";
        console.log("search command: " + cmd);
        cbsearch();
    };
}).call(jsDAV_Codesearch_Plugin.prototype = new jsDAV_ServerPlugin());

module.exports = jsDAV_Codesearch_Plugin;
