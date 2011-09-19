/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
var jsDAV              = require("./../../jsdav"),
    jsDAV_ServerPlugin = require("./../plugin").jsDAV_ServerPlugin,

    Fs    = require("fs"),
    Spawn = require("child_process").spawn,
    Exc   = require("./../exceptions"),
    Util  = require("./../util");

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
    //"skipped"     : "q"{"Files but not directories normally skipped by ack ("default": "off")},
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
// grep pattern matching for extensions
jsDAV_Codesearch_Plugin.PATTERN_EXT = Util.makeUnique(exts).join(",");
var dirs = [];
for (type in jsDAV_Codesearch_Plugin.IGNORE_DIRS) {
    dirs.push(type);
}
dirs = Util.makeUnique(dirs);
jsDAV_Codesearch_Plugin.PATTERN_DIR  = Util.escapeRegExp(dirs.join("|"));
jsDAV_Codesearch_Plugin.PATTERN_EDIR = dirs.join(",");
jsDAV_Codesearch_Plugin.GREP_CMD = "grep";
jsDAV_Codesearch_Plugin.MAXSIZE = 2097152; //2MB

(function() {
    this.initialize = function() {
        this.handler.addEventListener("report", this.httpReportHandler.bind(this));
    };

    this.httpReportHandler = function(e, reportName, dom) {
        if (reportName != "{DAV:}codesearch")
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

            _self.doCodesearch(node, options, function(err, sResults) {
                //if (err)
                //    return e.stop(err);
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

    this.doCodesearch = function(node, options, cbsearch) {
        var cmd   = jsDAV_Codesearch_Plugin.GREP_CMD + (Util.isTrue(options.regexp) ? " -P" : "") + " -s -r --color=never --binary-files=without-match -n",
            file  = this.handler.server.tmpDir + "/" + Util.uuid(),
            _self = this;
        if (!Util.isTrue(options.casesensitive))
            cmd += " -i ";
        var t,
            include = "*.{" + jsDAV_Codesearch_Plugin.PATTERN_EXT + "}";
        if (!Util.empty(options.pattern) && (t = jsDAV_Codesearch_Plugin.MAPPINGS[options.pattern]))
            include = (t.length > 1 ? "*.{" : "*.") + t.join(",") + (t.length > 1 ? "}" : "");
        if (options.maxresults)
            cmd += "-m " + parseInt(options.maxresults, 10);
        cmd += " --exclude=*{" + jsDAV_Codesearch_Plugin.PATTERN_EDIR + "}*"
            +  " --include=" + include + " "
            + Util.escapeShell(options.query)
            + " \"" + node.path + "\"";
        if (jsDAV.debugMode)
            console.log("search command: " + cmd);
        
        var out  = "",
            err  = "",
            grep = Spawn("/bin/bash", ["-c", cmd]);
        
        grep.stdout.setEncoding("utf8");
        grep.stderr.setEncoding("utf8");
        grep.stdout.on("data", function(data) {
            if (!Util.empty(data)) {
                out += data;
                if (out.length >= jsDAV_Codesearch_Plugin.MAXSIZE)
                    grep.kill();
            }
        });
        grep.stderr.on("data", function(data) {
            if (!Util.empty(data))
                err += data;
        });
        grep.on("exit", function(code, signal) {
            options.killed = (signal == "SIGTERM");
            cbsearch(err, _self.parseSearchResult(out || "", node.path, options));
        });
    };

    function truncate(s, options) {
        var len = options.maxexcerptlength || 200;
        s = Util.trim(s);
        if (s.length <= len)
            return s;
        var res,
            pos = s.indexOf(options.query);
        if (pos > -1) {
            if ((pos + options.query.length) < len)
                res = s.substr(0, len - 3) + "...";
            else
                res = "..." + s.substr(pos - (Math.floor(len / 2) - options.query.length), len - 6) + "...";
        }
        else {
            res = s.substr(0, len - 3) + "...";
        }
        return res;
    }

    this.parseSearchResult = function(res, basePath, options) {
        var namespace, prefix, lastFile, parts, file,
            aLines = (typeof res == "string" ? res : "").split(/([\n\r]+)/g),
            i      = 0,
            count  = 0,
            l      = aLines.length,
            aXml   = ['<?xml version="1.0" encoding="utf-8"?><d:multistatus count="' + l + '"'];
        // Adding in default namespaces
        for (namespace in this.handler.xmlNamespaces) {
            prefix = this.handler.xmlNamespaces[namespace];
            aXml.push(' xmlns:' + prefix + '="' + namespace + '"');
        }
        aXml.push('><d:querydetail query="' + Util.escapeXml(options.query) + '" />');
        if (options.killed)
            aXml.push('<d:maxreached/>');
        for (; i < l; ++i) {
            parts = aLines[i].split(":");
            if (parts.length < 3) continue;
            ++count;
            if ((file = parts.shift()) !== lastFile) {
                if (lastFile)
                    aXml.push('</d:response>');
                aXml.push('<d:response path="' + encodeURI(options.uri
                    + Util.rtrim(file.replace(basePath, "")), "/") + '" query="',
                    Util.escapeXml(options.query), '">');
                lastFile = file;
            }
            aXml.push('<d:excerpt line="', parts.shift(), '">', 
                Util.escapeXml(truncate(parts.join(":"), options)), '</d:excerpt>');
        }
        if (count > 0)
            aXml.push('</d:response>');
        return aXml.join("") + '</d:multistatus>';
    };
}).call(jsDAV_Codesearch_Plugin.prototype = new jsDAV_ServerPlugin());

module.exports = jsDAV_Codesearch_Plugin;
