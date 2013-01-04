"use strict";

var assert = require("assert");
var exec   = require('child_process').spawn;
var jsDAV  = require("./../lib/jsdav");
var FtpTree  = require("./../lib/DAV/backends/ftp/tree").jsDAV_Tree_Ftp;

var daemon;
var FTPCredentials = {
    host: "localhost",
    user: "user",
    port: 3334,
    pass: "12345"
};

jsDAV.debugMode = true;

module.exports = {
    timeout: 5000,

    "test getRealPath 1": function(next) {
        var tree = FtpTree.new({
            ftp: {
                path: "/blah\\"
            }
        });
        assert.equal(tree.getRealPath("sergi"), "/blah\\/sergi");
        next();
    },

    "test getRealPath 2": function(next) {
        var tree = FtpTree.new({
            ftp: {
                path: "home"
            }
        });
        assert.equal(tree.getRealPath("sergi"), "/home/sergi");
        next();
    },

    "test getRealPath 3": function(next) {
        var tree = FtpTree.new({
            ftp: {
                path: "/home"
            }
        });
        assert.equal(tree.getRealPath("/home"), "/home");
        next();
    }
};

!module.parent && require("./../node_modules/asyncjs/lib/test").testcase(module.exports, "FTP"/*, timeout*/).exec();

