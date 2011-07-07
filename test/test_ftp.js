var assert = require("assert");
//var Ftp = require("./ftp");
var Fs = require("fs");
var exec = require('child_process').spawn;
var jsDAV = require("./../lib/jsdav");
//var Ftp = require("./../support/node-ftp").Ftp;

var _c = {
    host: "ftp.merino.ws",
    username: "lmerino",
    passwd: "root1234",
    port: 21
};

jsDAV.debugMode = true;

module.exports = {
    timeout: 10000,

    setUp: function(next) {
        exec('/bin/launchctl', ['load', '-w', '/System/Library/LaunchDaemons/ftp.plist']);

        this.server = jsDAV.createServer({
            type: "ftp",
            ftp: {
                host:   _c.host,
                user:   _c.username,
                password: _c.passwd,
                port: _c.port,
                node: "/c9"
            }
        }, 8000);

        this.ftp = this.server.tree.ftp;

        next();
    },

    tearDown: function(next) {
        exec('/bin/launchctl', ['unload', '-w', '/System/Library/LaunchDaemons/ftp.plist']);
        this.server = null;
        next();
    },
    /** Note: basically all tests can ass<ume user is authorized after this,
      * because checkings are done in each required FTP method */
    "test ftp connect": function(next) {
        console.log(this.ftp)
        var self = this;
        function assertError(e) {
            if (e) throw e;
            else throw new Error("FTP timed out.")
        };

        this.ftp.on("connect", function() {
            console.log("FTP connected")
            next();
        });

        this.ftp.on("error", assertError)
        this.ftp.on("timeout", assertError)

        this.ftp.connect(_c.port, _c.host);
    },
   "test User logs in, lists root directory, logs out": funciton() {
        var self = this;
        self.ftp.auth(_c.username, _c.passwd, function(err) {
            assert.ok(!err);
            next();
        });
    }
};

process.on("exit", function() {
    if (module.exports.conn)
        module.exports.conn.end();
});

!module.parent && require("./../support/async.js/lib/test").testcase(module.exports, "FTP"/*, timeout*/).exec();


