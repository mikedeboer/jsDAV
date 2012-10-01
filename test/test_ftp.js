"use strict";

var assert = require("assert");
var Fs     = require("fs");
var exec   = require('child_process').spawn;
var jsDAV  = require("./../lib/jsdav");
var FtpTree  = require("./../lib/DAV/tree/ftp").jsDAV_Tree_Ftp;
var Http   = require("http");
var _      = {
    extend: function(obj) {
        Array.prototype.slice.call(arguments, 1).forEach(function(source) {
          for (var prop in source)
            if (source[prop] !== void 0)
                obj[prop] = source[prop];
        });
        return obj;
    }
};

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

    setUpSuite: function(next) {
        if (FTPCredentials.host === "localhost") {
            try {
                daemon = exec('python', ['test/basic_ftpd.py']);
            }
            catch(e) {
                console.log(
                    "There was a problem trying to start the FTP service." +
                    " . This could be because you don't have enough permissions" +
                    "to run the FTP service on the given port.\n\n" + e
                );
            }
        }

        var self = this;
        var server;
        setTimeout(function() {
            server = self.server = jsDAV.createServer({
                type: "ftp",
                node: "/c9",
                ftp: FTPCredentials
            }, 8000);

            self.ftp = server.tree.ftp;
            next();
        }, 200);
    },

    tearDownSuite: function(next) {
        if (daemon)
            daemon.kill();

        this.server.tree.unmount();
        this.server = null;
        next();
    },

    "test getRealPath 1": function(next) {
        var tree = new FtpTree({
            ftp: {
                path: "/blah\\"
            }
        });
        assert.equal(tree.getRealPath("sergi"), "/blah\\/sergi");
        next();
    },

    "test getRealPath 2": function(next) {
        var tree = new FtpTree({
            ftp: {
                path: "home"
            }
        });
        assert.equal(tree.getRealPath("sergi"), "/home/sergi");
        next();
    },

    "test getRealPath 3": function(next) {
        var tree = new FtpTree({
            ftp: {
                path: "/home"
            }
        });
        assert.equal(tree.getRealPath("/home"), "/home");
        next();
    }
};

process.on("exit", function() {
    if (module.exports.conn)
        module.exports.conn.end();
});

!module.parent && require("./../node_modules/asyncjs/lib/test").testcase(module.exports, "FTP"/*, timeout*/).exec();

