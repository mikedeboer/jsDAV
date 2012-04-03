/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV              = require("./../../jsdav");
var jsDAV_ServerPlugin = require("./../plugin").jsDAV_ServerPlugin;

var Spawn = require("child_process").spawn;
var Util  = require("./../util");

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
    "make"        : ["makefile"],
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
jsDAV_Codesearch_Plugin.PERL_CMD = "perl";
jsDAV_Codesearch_Plugin.MAXSIZE = 68157440; // 65MB

(function() {
    this.initialize = function() {
        this.handler.addEventListener("report", this.httpReportHandler.bind(this));
    };

    this.httpReportHandler = function(e, reportName, dom) {
        if (reportName != "{DAV:}codesearch")
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

            self.doCodesearch(node, options, function(err, sResults) {
                //if (err)
                //    return e.stop(err);
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

    this.doCodesearch = function(node, options, cbsearch) {
        var cmd = jsDAV_Codesearch_Plugin.GREP_CMD + " -P -s -r --color=never --binary-files=without-match -n " + ( !Util.isTrue(options.casesensitive) ? "-i" : "" );
        
        var self  = this;// Util.empty(options.replacement) ? "" : options.replacement

        var include = "";
        
        if (!Util.empty(options.pattern)) {
            var patterns = options.pattern.split(","); 

            if (patterns.length > 0) {
                patterns.forEach(function (p, idx) { 
                    patterns[idx] = p.split('.').pop(); // trim "*.", e.g. *.js -> js, foo.js.cs -> cs
                });
                
                patterns.push("");
                include = "*.{" + patterns.join(",") + "}";
            }
            else {
                include = "*.{" + jsDAV_Codesearch_Plugin.PATTERN_EXT + "}";   
            }
        } 
        else {
            include = "*.{" + jsDAV_Codesearch_Plugin.PATTERN_EXT + "}";
        }
   
        if (options.maxresults) {
            cmd += "-m " + parseInt(options.maxresults, 10);
        }

        var query = options.query;
        // grep has a funny way of handling new lines (that is to say, it's non-existent)
        // if we're not doing a regex search, then we must split everything between the 
        // new lines, escape the content, and then smush it back together; due to 
        // new lines, this is also why we're  now passing -P as default to grep
        if (!Util.isTrue(options.replaceAll) && !Util.isTrue(options.regexp)) {
            var splitQuery = query.split("\\n");

            for (var q in splitQuery) {
                splitQuery[q] = Util.grepEscapeRegExp(splitQuery[q]); 
            }
            query = splitQuery.join("\\n");
        }
        
        cmd += " --exclude=*{" + jsDAV_Codesearch_Plugin.PATTERN_EDIR + "}*"
            +  " --include=" + include 
            + " '" + query + "'"
            + " \"" + Util.escapeShell(node.path) + "\"";  

        if (Util.isTrue(options.replaceAll) && !Util.empty(options.replacement)) {
            // pipe the grep results into perl
            cmd += " -l | xargs " + jsDAV_Codesearch_Plugin.PERL_CMD +
            // print the grep result to STDOUT (to arrange in parseSearchResult())
            " -p0777i -e 'print STDOUT \"$ARGV:$.:$_\""     +       
            // do the actual replace
            "if s/" + query + "/" + options.replacement + "/mg" + ( !Util.isTrue(options.casesensitive) ? "i" : "" ) + ";'"
        }

        if (jsDAV.debugMode) {
            Util.log("search command: " + cmd); 
        }

        var out  = "";
        var err  = "";
        var grep = Spawn("/bin/bash", ["-c", cmd]);
        
        grep.stdout.setEncoding("utf8");
        grep.stderr.setEncoding("utf8");
        grep.stdout.on("data", function(data) {
            if (!Util.empty(data)) {
                out += data;
                
                if (out.length >= jsDAV_Codesearch_Plugin.MAXSIZE) {
                    grep.kill();
                }
            }
        });
        grep.stderr.on("data", function(data) {
            if (!Util.empty(data))
                err += data;
        });
        grep.on("exit", function(code, signal) {
            options.killed = (signal == "SIGTERM");
            
            cbsearch(err, self.parseSearchResult(out || "", node.path, options));
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
        var namespace, prefix, lastFile, parts, file, lineno;
        var aLines      = (typeof res == "string" ? res : "").split(/([\n\r]+)/g);
        var i           = 0;
        var count       = 0;
        var filecount   = 0;
        var l           = aLines.length;
        var aXml        = ['<?xml version="1.0" encoding="utf-8"?><d:multistatus count="'];
        
        // Adding in default namespaces
        for (namespace in this.handler.xmlNamespaces) {
            prefix = this.handler.xmlNamespaces[namespace];
            aXml.push(' xmlns:' + prefix + '="' + namespace + '"');
        }
        
        aXml.push('><d:querydetail query="' + Util.escapeXml(options.query) + '" replacement="' + Util.escapeXml(options.replacement));
        
        if (options.killed)
            aXml.push('<d:maxreached/>');

        for (; i < l; ++i) {
            parts = aLines[i].split(":");
            
            if (parts.length < 3) continue;
            ++count;
            file = parts.shift();
            lineno = parseInt(parts.shift(), 10);
            if (!lineno)
                continue;
            if (file !== lastFile) {
                filecount++;
                if (lastFile)
                    aXml.push('</d:response>');
                aXml.push('<d:response path="' + encodeURI(options.uri
                    + Util.rtrim(file.replace(basePath, "")), "/") + '" query="',
                    Util.escapeXml(options.query), '">');
                lastFile = file;
            }
            aXml.push('<d:excerpt line="', lineno, '">', 
                Util.escapeXml(truncate(parts.join(":"), options)), '</d:excerpt>');
        }
        if (count > 0)
            aXml.push('</d:response>');
        // add the final count to the multistatus XML element
        aXml[0] += count + '"';
        
        var optionsDesc = [];
        if (Util.isTrue(options.casesensitive)) {
            optionsDesc.push("case sensitive");
        }
        if (Util.isTrue(options.regexp)) {
            optionsDesc.push("regexp");
        }
        
        if (optionsDesc.length > 0) {
            optionsDesc = "(" + optionsDesc.join(", ") + ")";
        }
        else {
            optionsDesc = "";
        }
        
        aXml[3] += '" options="' + optionsDesc + '" count="' + count + '" filecount="' + filecount + '" />'; //add query metainfo
        return aXml.join("") + '</d:multistatus>';
    };
}).call(jsDAV_Codesearch_Plugin.prototype = new jsDAV_ServerPlugin());

module.exports = jsDAV_Codesearch_Plugin;
