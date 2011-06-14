/**
 * @package     node-ftp
 * @subpackage  test
 * @copyright   Copyright(c) 2011 Ajax.org B.V. <info AT ajax.org>
 * @author      Luis Merino <mail AT luismerino DOT name>
 * @license     http://github.com/ajaxorg/node-ftp/blob/master/LICENSE MIT License
 */

var assert = require("assert");
var Ftp = require("../ftp");
var Fs = require("fs");

// Execution ORDER: test.setUpSuite, setUp, testFn, tearDown, test.tearDownSuite
module.exports = {
    
    timeout: 10000,
    
    /*setUpSuite: function() {
        var dummy = {
            host: 'ftp.secureftp-test.com',
            user: 'test',
            pass: 'test',
            port: 21,
            connTimeout: 10000,
            debug: true
        };
        this.dflt = new Ftp(dummy).connect();
        this.dflt.on('connect', next);
    },*/
    
    setUp: function(next) {
        this.$initial = '/c9';
        this.conn = new Ftp();
        next();
    },
    
    tearDown: function(next) {
        this.conn.end();
        next();
    },
    /** Note: basically all tests can assume user is authorized after this,
      * because checkings are done in each required FTP method */
    "test ftp auth": function(next) {
        var self = this;
        this.conn.on('connect', function(err) {
            assert.ok(!err);
            self.conn.auth('luismerino', '12monkeys', function(err) {
                assert.ok(!err);
                next();
            });
        });
        this.conn.connect(21, 'moran.dreamhost.com');
    },
    
    "!test ftp secure auth": function(next) {
        var self = this;
        this.conn.on('connect', function(err) {
            assert.ok(!err);
            self.conn.auth('luismerino', '12monkeys', function(err) {
                assert.ok(!err);
                next();
            });
        });
        this.conn.connect(22, 'moran.dreamhost.com');
    },
    
    "test ftp node stat": function(next) {
        var self = this;
        function afterConnect() {
            self.conn.stat(self.$initial, function(err, stat) {
                assert.ok(!err);
                assert.equal(stat.name, self.$initial.substr(1)/*c9*/);
                next();
            });
        }
        this["test ftp auth"](afterConnect);
    },
    
    "test ftp mkdir": function(next) {
        var self = this;
        function afterConnect() {
            var newDir = self.$initial + '/' + 'files';
            self.conn.mkdir(newDir, function(err) {
                assert.ok(!err);
                next();
            });
        }
        this["test ftp auth"](afterConnect);
    },
    
    "test ftp cwd and upload non-binary file": function(next) {
        var self = this,
            localpath = './fixtures/foo.txt',
            destpath = 'foo.txt';
        
        function afterConnect() {
            var newDir = self.$initial + '/' + 'files';
            self.conn.cwd(newDir, function(err) {
                assert.ok(!err);
                var instream = Fs.createReadStream(localpath);
                self.conn.put(instream, destpath, function(err) {
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
    
    "test ftp cwd and upload binary file and its size": function(next) {
        var self = this,
            localpath = './fixtures/logo.png',
            destpath = 'logo.png';
        
        function afterConnect() {
            var newDir = self.$initial + '/' + 'files';
            self.conn.cwd(newDir, function(err) {
                assert.ok(!err);
                var instream = Fs.createReadStream(localpath);
                self.conn.put(instream, destpath, function(err) {
                    assert.ok(!err);
                    self.conn.size(destpath, function(err, size) {
                        assert.ok(!err);
                        assert.equal(size, Fs.statSync(localpath).size);
                        next();
                    });
                });
            });
        }
        this["test ftp auth"](afterConnect);
    },
    
    "test ftp rename file": function(next) {
        var self = this,
            pathFrom = self.$initial + '/' + 'files/foo.txt',
            pathTo = self.$initial + '/' + 'files/bar.md';
            
        function afterConnect() {
            self.conn.rename(pathFrom, pathTo, function(err) {
                assert.ok(!err);
                self.conn.stat(pathTo, function(err, stat) {
                    assert.ok(!err);
                    assert.equal(stat.name, 'bar.md');
                    next();
                });
            });
        }
        this["test ftp auth"](afterConnect);
    },
    
    "test ftp readdir and verify all files": function(next) {
        var self = this,
            path = self.$initial + '/' + 'files',
            fileListNames = ['bar.md', 'logo.png'];
            
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
            path = self.$initial + '/' + 'files/logo.png',
            localPath = './fixtures/logo.png',
            localPathNew = './fixtures/downloaded_logo.png';
        
        function afterConnect() {
            var outstream = Fs.createWriteStream(localPathNew);
            self.conn.get(path, function(err, instream) {
                assert.ok(!err);
                instream.on('error', function() {
                    assert.fail();
                });
                instream.on('success', function() {
                    assert.equal(Fs.statSync(localPath).size, Fs.statSync(localPath).size);
                    next();
                });
                instream.pipe(outstream);
            });
        }
        this["test ftp auth"](afterConnect);
    },
    
    "test ftp delete file": function(next, path) {
        var self = this,
            path = path || self.$initial + '/' + 'files/logo.png';
            
        function afterConnect() {
            self.conn['delete'](path, function(err) {
                assert.ok(!err);
                self.conn.stat(path, function(err) {
                    assert.ok(err); // File shouldn't be there and therefore the Error
                    next();
                });
            });
        }
        this["test ftp auth"](afterConnect);
    },
    
    "test ftp append to file and lastMod": function(next) {
        var self = this,
            path = self.$initial + '/' + 'files/bar.md';
            
        function afterConnect() {
            self.conn.lastMod(path, function(err, timeObj) {
                assert.ok(!err);
                assert.ok(timeObj.getDate());
                appendToFile(timeObj);
            });
        }
        function appendToFile(lastMod) {
            var instream = Fs.createReadStream('./fixtures/lorem.md');
            self.conn.append(instream, path, function(err) {
                assert.ok(!err);
                self.conn.stat(path, function(err, stat) {
                    assert.ok(!err);
                    assert.ok(stat.size > Fs.statSync('./fixtures/foo.txt').size); // foo.txt == original uploaded file
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
            dirPath = self.$initial + '/' + 'files',
            path = self.$initial + '/' + 'files/bar.md';
            
        function afterConnect() {
            self.conn.rmdir(dirPath, function(err) {
                if (!err) {
                    self.conn.stat(dirPath, function(err) {
                        assert.ok(err); // Directory shouldn't be there and therefore the Error
                        next();
                    });
                } else { // Not empty, so we need to delete remaining file first
                    assert.ok(err);
                    self.conn['delete'](path, function(err) {
                        assert.ok(!err);
                        self.conn.stat(path, function(err) {
                            assert.ok(err); // File shouldn't be there and therefore the Error
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

!module.parent && require("./../../async.js/lib/test").testcase(module.exports, "FTP"/*, timeout*/).exec();