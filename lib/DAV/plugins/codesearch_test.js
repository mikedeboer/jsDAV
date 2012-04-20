/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax.org>
 * @author Ruben Daniels <ruben AT c9 DOT io>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var assert = require("assert");
var jsDAV  = require("../../../lib/jsdav");
var jsDAV_Codesearch_Plugin = require("./codesearch");

jsDAV.debugMode = true;

module.exports = {
    timeout: 30000,

    setUpSuite: function(next) {
        this.plugin = new jsDAV_Codesearch_Plugin({
            addEventListener: function() {}
        });
        next();
    },

    tearDownSuite: function(next) {
        next();
    },

    "test retrieving a file list": function(next) {
        var all = '';
        this.plugin.doCodesearch({path: __dirname}, {query: "tearDown", pattern: "*.*",  uri: "http://bla/"}, function(out){
            all += out;
        }, function(err, out) {
            all += out;
            var matches = all.match(/<\/d:excerpt>/g);
            assert.equal(matches.length, 4, "count results");
            next();
        });
    }
};

process.on("exit", function() {
    if (module.exports.conn)
        module.exports.conn.end();
});

!module.parent && require("../../../node_modules/asyncjs/lib/test").testcase(module.exports).exec();
