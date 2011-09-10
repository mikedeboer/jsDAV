
var assert = require("assert");
var Fs     = require("fs");
var exec   = require('child_process').spawn;
var jsDAV  = require("./../lib/jsdav");
var Http   = require("http");
var _      = {
    extend: function(obj) {
        Array.prototype.slice.call(arguments, 1).forEach(function(source) {
          for (var prop in source)
            if (source[prop] !== void 0)
                obj[prop] = source[prop];
        });
        return obj;
    };
};

var _c = {
    host: "www.linhnguyen.nl",
    username: "cloud9",
    pass: "cloud9",
    port: 21
};

jsDAV.debugMode = true;

module.exports = {
    timeout: 30000,

    setUpSuite: function(next) {
        //exec('/bin/launchctl', ['load', '-w', '/System/Library/LaunchDaemons/ftp.plist']);

        var server = this.server = jsDAV.createServer({
            type: "ftp",
            node: "/c9",
            ftp: {
                host: _c.host,
                user: _c.username,
                pass: _c.pass,
                port: _c.port
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
        this.ftp.auth(_c.username, _c.pass, function(err) {
            assert.ok(!err);
            _self.ftp.readdir("/", function(err, nodes) {
                assert.ok(!err);
                assert.ok(Array.isArray(nodes));
                next();
            });
        });
    },
    /**
     * 3rd Scenario
     * User logs in and lists (first PROPFIND of basePath)
     * creates a folder in root
     * creates a file in it
     * creates a second folder in root
     * moves first folder in second
     * logs out
     */
    ">test Stateless requests on jsDav Ftp": function(next) {
        var _self = this;
        var options = _.extend(this.getHttpReqOptions(), {
            path: "/",
            method: "PROPFIND"
        });
        var request = Http.request(options);
        request.write('<?xml version="1.0" encoding="utf-8" ?><D:propfind xmlns:D="DAV:"><D:allprop /></D:propfind>');
        request.on("response", function(res) {
            res.on("data", function(buff) {
                xmlResponse = buff.toString();
                assert.ok(xmlResponse.indexOf("HTTP/1.1 200 Ok") > -1);
                afterPropfind.call(_self);
            });
        });
        request.end();

        function afterPropfind() {
            var successes = 0,
                _self = this;
            // Request #1: creates a folder in root
            setTimeout(function() {
                options = _.extend(_self.getHttpReqOptions(["content-length"]), {
                    path: "/New_Ftp_Folder",
                    method: "MKCOL",
                    headers: {
                        "content-length": 0
                    }
                });
                Http.request(options, function(res) {
                    assert.equal(res.statusCode, 201);
                    successes++;
                }).end();
            }, 100);
            // Request #2: creates a file in it
            setTimeout(function() {
                options = _.extend(_self.getHttpReqOptions(["content-length", "content-type"]), {
                    path: "/New_Ftp_Folder/Untitled.js",
                    method: "PUT",
                    headers: {
                        "content-length": 0,
                        "content-type": "text/plain"
                    }
                });
                Http.request(options, function(res) {
                    assert.equal(res.statusCode, 201);
                    successes++;
                }).end();
            }, 200);
            // Request #3: create a second folder in root
            setTimeout(function() {
                options = _.extend(_self.getHttpReqOptions(["content-length"]), {
                    path: "/New_Ftp_Folder_2",
                    method: "MKCOL",
                    headers: {
                        "content-length": 0
                    }
                });
                Http.request(options, function(res) {
                    assert.equal(res.statusCode, 201);
                    successes++;
                }).end();
            }, 300);
            // Request #4: moves first folder into second
            setTimeout(function(){
                options = _.extend(_self.getHttpReqOptions(["content-length"]), {
                    path: "/New_Ftp_Folder",
                    method: "MOVE",
                    headers: {
                        "destination": "/New_Ftp_Folder_2/New_Ftp_Folder",
                        "content-length": 0
                    }
                });
                Http.request(options, function(res) {
                    assert.equal(res.statusCode, 201);
                    successes++;
                }).end();
            }, 400); // give a little time to run the two MKCOL requests first.
            var loop = setInterval(function() {
                console.log('Interval: Number of responses back...', successes);
                if (successes >= 4) {
                    clearInterval(loop);
                    next();
                }
            }, 1000);
        }
    },

    getHttpReqOptions: function(exclude_headers, exclude) {
        var options = {
            host: "127.0.0.1",
            port: 8000,
            headers: {
                "accept": "*/*",
                //"Accept-Charset": "ISO-8859-1,utf-8;q=0.7,*;q=0.3",
                //"Accept-Encoding": "gzip,deflate,sdch",
                //"Accept-Language": "en-US,en;q=0.8",
                "connection": "keep-alive",
                "content-Length": 92,
                "content-type": "text/xml; charset=UTF-8",
                //"depth": 1,
                //"host": "localhost:5000",
                //"Origin": "http://localhost:5000",
                //"Referer": "http://localhost:5000/luismerino/ftp"
                //"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_7) AppleWebKit/535.1 (KHTML, like Gecko) Chrome/13.0.782.41 Safari/535.1",
                //"X-Requested-With": "XMLHttpRequest"
            }
        };
        if (Array.isArray(exclude_headers)) {
            Object.keys(options.headers).forEach(function(key) {
                if (exclude_headers.indexOf(key) > -1)
                    delete options.headers[key];
            });
        }
        if (Array.isArray(exclude)) {
            Object.keys(options).forEach(function(key) {
                if (exclude.indexOf(key) > -1)
                    delete options[key];
            });
        }
        return options;
    }
};

process.on("exit", function() {
    if (module.exports.conn)
        module.exports.conn.end();
});

!module.parent && require("./../support/async.js/lib/test").testcase(module.exports, "FTP"/*, timeout*/).exec();
