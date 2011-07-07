
var assert = require("assert");
var Fs     = require("fs");
var exec   = require('child_process').spawn;
var jsDAV  = require("./../lib/jsdav");
var _      = require("../support/node-ftp/support/underscore");

var _c = {
    host: "ftp.merino.ws",
    username: "lmerino",
    passwd: "root1234",
    port: 21
};

jsDAV.debugMode = true;

module.exports = {
    timeout: 10000,

    setUpSuite: function(next) {
        //exec('/bin/launchctl', ['load', '-w', '/System/Library/LaunchDaemons/ftp.plist']);
        
        var server = this.server = jsDAV.createServer({
            type: "ftp",
            ftp: {
                host:     _c.host,
                user:     _c.username,
                password: _c.passwd,
                port:     _c.port,
                node:     "/c9"
            }
        }, 8000);

        this.ftp = server.tree.ftp;
        next();
    },

    tearDownSuite: function(next) {
        //exec('/bin/launchctl', ['unload', '-w', '/System/Library/LaunchDaemons/ftp.plist']);
        
        this.server.tree.unmount();
        this.server = null;
        next();
    },
    "test Ftp connect": function(next) {
        var self = this;
        function assertError(e) {
            if (e) throw e;
            else throw new Error("FTP timed out.")
        };

        this.ftp.on("connect", function() {
            next();
        });
        this.ftp.on("error", assertError)
        this.ftp.on("timeout", assertError)

        this.ftp.connect(_c.port, _c.host);
    },
   "test User logs in, lists root directory, logs out": function(next) {
        var _self = this;
        this.ftp.auth(_c.username, _c.passwd, function(err) {
            assert.ok(!err);
            _self.ftp.readdir("/", function(err, nodes) {
                assert.ok(!err);
                assert.ok(_.isArray(nodes));
                next();
            });
        });
    }
};

process.on("exit", function() {
    if (module.exports.conn)
        module.exports.conn.end();
});

!module.parent && require("./../support/async.js/lib/test").testcase(module.exports, "FTP"/*, timeout*/).exec();


