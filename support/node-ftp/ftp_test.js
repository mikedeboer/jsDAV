/**
 * @package     node-ftp
 * @subpackage  test
 * @copyright   Copyright(c) 2011 Ajax.org B.V. <info AT ajax.org>
 * @author      Luis Merino <mail AT luismerino DOT name>
 * @license     http://github.com/ajaxorg/node-ftp/blob/master/LICENSE MIT License
 */

var assert = require("assert");
var Ftp = require("./ftp");
var Fs = require("fs");
var exec = require('child_process').spawn;

var FTPCredentials = {
    host: "",
    username: "",
    passwd: "",
    port: 2021
};

// Execution ORDER: test.setUpSuite, setUp, testFn, tearDown, test.tearDownSuite
module.exports = {
    timeout: 10000,

    setUp: function(next) {
        exec('/bin/launchctl', ['load', '-w', '/System/Library/LaunchDaemons/ftp.plist']);

        if (this.conn)
            this.conn.end();

        this.$initial = "/c9";
        this.conn = new Ftp({
            cwd: "/Users/" + FTPCredentials.username + "/"
        });
        next();
    },

    tearDown: function(next) {
        exec('/bin/launchctl', ['unload', '-w', '/System/Library/LaunchDaemons/ftp.plist']);
        this.conn.end();
        next();
    },
    /** Note: basically all tests can ass<ume user is authorized after this,
      * because checkings are done in each required FTP method */
    "test ftp auth": function(next) {
        var self = this;
        this.conn.on("connect", function() {
            self.conn.auth(FTPCredentials.username, FTPCredentials.passwd, function(err) {
                assert.ok(!err);
                next();
            });
        });
        this.conn.connect(FTPCredentials.port, FTPCredentials.host);
    },

    "!test ftp secure auth": function(next) {
        var self = this;
        this.conn.on("connect", function(err) {
            self.conn.auth("test", "test", function(err) {
                assert.ok(!err);
                next();
            });
        });
        this.conn.connect(22, "ftp.secureftp-test.com");
    },

    ">test ftp node stat": function(next) {
        var self = this;
        function afterConnect() {
            var path = "/Users/" + FTPCredentials.username + "/";
            self.conn.cwd(path, function(err, data) {
                self.conn.stat(path + self.$initial, function(err, stat) {
                    assert.ok(!err);
                    console.log(stat.name)
                    assert.equal(stat.name, self.$initial.substr(1));
                    next();
                });
            });
        }
        this["test ftp auth"](afterConnect);
    },

    "test ftp mkdir": function(next) {
        var self = this;
        function afterConnect() {
            var newDir = self.$initial + "/" + "files";
            self.conn.mkdir(newDir, function(err) {
                assert.ok(!err);
                next();
            });
        }
        this["test ftp auth"](afterConnect);
    },

    "test ftp cwd and upload non-binary file": function(next) {
        var self = this,
            destpath = "foo.txt";

        function afterConnect() {
            var newDir = self.$initial + "/" + "files";
            self.conn.cwd(newDir, function(err) {
                assert.ok(!err);
                self.conn.put(new Buffer("sample data"), destpath, function(err) {
                    assert.ok(!err);
                    self.conn.stat(destpath, function(err, stat) {
                        assert.ok(!err);
                        assert.equal(stat.name, destpath);
                        assert.ok(stat.isFile());
                        next();
                    });
                });
            });
        }
        this["test ftp auth"](afterConnect);
    },

    "test ftp upload binary file and its size": function(next) {
        var self = this;
        var localpath = "fixtures/logo.png";
        var destpath  = this.$initial + "/files/logo.png";

        function afterConnect() {
            var newDir = self.$initial + "/" + "files";
            Fs.readFile(localpath, "binary", function(err, data) {
                assert.ok(!err);
                self.conn.put(new Buffer(data, "binary"), destpath, function(err, res) {
                    assert.ok(!err);

                    /*
                    self.conn.size(destpath, function(err, size) {
                        if (err) throw err;
                        assert.equal(size, Fs.statSync(localpath).size);
                        next();
                    });
                    */
                    next();
                });
            });
        }
        this["test ftp auth"](afterConnect);
    },

    "test ftp rename file": function(next) {
        var self = this,
            pathFrom = self.$initial + "/" + "files/foo.txt",
            pathTo = self.$initial + "/" + "files/bar.md";

        function afterConnect() {
            self.conn.rename(pathFrom, pathTo, function(err) {
                    console.log(err)
                assert.ok(!err);
                self.conn.stat(pathTo, function(err, stat) {
                    assert.ok(!err);
                    assert.equal(stat.name, "bar.md");
                    next();
                });
            });
        }
        this["test ftp auth"](afterConnect);
    },

    "test ftp readdir and verify all files": function(next) {
        var self = this,
            path = self.$initial + "/" + "files",
            fileListNames = ["bar.md", "logo.png"];

        function afterConnect() {
            self.conn.stat(path, function(err, dir) {
                assert.ok(!err);
                assert.ok(dir.isDirectory());
                self.conn.readdir(path, function(err, files) {
                    assert.ok(!err);
                    for (var i=0; i < files.length; i++) {
                        assert.ok(fileListNames.indexOf(files[i].name));
                        if (i === files.length-1)
                            next();
                    }
                });
            });
        }
        this["test ftp auth"](afterConnect);
    },

    "test ftp get file": function(next) {
        var self = this,
            path = self.$initial + "/files/logo.png",
            localPath = "fixtures/logo.png";

        function afterConnect() {
            self.conn.get(path, function(err, buffer) {
                assert.ok(!err);
                assert.equal(buffer.length, Fs.statSync(localPath).size);
                next();
            });
        }
        this["test ftp auth"](afterConnect);
    },

    "test ftp delete file": function(next, path) {
        var self = this,
            path = path || self.$initial + "/" + "files/logo.png";

        function afterConnect() {
            self.conn["delete"](path, function(err) {
                assert.ok(!err);
                self.conn.stat(path, function(err) {
                    assert.ok(err); // File shouldn"t be there and therefore the Error
                    next();
                });
            });
        }
        this["test ftp auth"](afterConnect);
    },

    "test ftp append to file and lastMod": function(next) {
        var self = this,
            path = self.$initial + "/" + "files/bar.md";

        function afterConnect() {
            self.conn.lastMod(path, function(err, timeObj) {
                assert.ok(!err);
                assert.ok(timeObj.getDate());
                appendToFile(timeObj);
            });
        }
        function appendToFile(lastMod) {
            var instream = Fs.createReadStream("./fixtures/lorem.md");
            self.conn.append(instream, path, function(err) {
                assert.ok(!err);
                self.conn.stat(path, function(err, stat) {
                    assert.ok(!err);
                    assert.ok(stat.size > Fs.statSync("./fixtures/foo.txt").size); // foo.txt == original uploaded file
                    self.conn.lastMod(path, function(err, timeObj) {
                        assert.ok(!err);
                        assert.ok(timeObj.getDate());
                        assert.ok(timeObj > lastMod); // modification date is higher than the one retrieved before append()
                        next();
                    });
                });
            });
        }
        this["test ftp auth"](afterConnect);
    },

    "test ftp delete directory": function(next) {
        var self = this,
            dirPath = self.$initial + "/" + "files",
            path = self.$initial + "/" + "files/bar.md";

        function afterConnect() {
            self.conn.rmdir(dirPath, function(err) {
                if (!err) {
                    self.conn.stat(dirPath, function(err) {
                        assert.ok(err); // Directory shouldn"t be there and therefore the Error
                        next();
                    });
                } else { // Not empty, so we need to delete remaining file first
                    assert.ok(err);
                    self.conn["delete"](path, function(err) {
                        assert.ok(!err);
                        self.conn.stat(path, function(err) {
                            assert.ok(err); // File shouldn"t be there and therefore the Error
                            afterConnect();
                        });
                    });
                }
            });
        }
        this["test ftp auth"](afterConnect);
    },

    "test ftp system": function(next) {
        var self = this;

        function afterConnect() {
            self.conn.system(function(err) {
                assert.ok(!err);
                next();
            });
        }
        this["test ftp auth"](afterConnect);
    },

    "test ftp status": function(next) {
        var self = this;

        function afterConnect() {
            self.conn.system(function(err) {
                assert.ok(!err);
                next();
            });
        }
        this["test ftp auth"](afterConnect);
    },

    "test ftp restart": function(next) {
        //@todo for interrupted file transfers.
        next();
    }
};

process.on("exit", function() {
    if (module.exports.conn)
        module.exports.conn.end();
});

!module.parent && require("./../async.js/lib/test").testcase(module.exports, "FTP"/*, timeout*/).exec();
