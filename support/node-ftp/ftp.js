var util = require('util'),
    net = require('net'),
    EventEmitter = require('events').EventEmitter,
    
    debug = function() { console.log('>>',arguments); };

var FTP = module.exports = function(options) {
    this.$socket = null;
    this.$dataSock = null;
    this.$state = null;
    this.$pasvPort = null;
    this.$pasvIP = null;
    this.$feat = null;
    this.$queue = [];
    this.options = {
        host: 'localhost',
        port: 21,
        /*secure: false,*/
        connTimeout: 15000, // in ms
        debug: false/*,
        active: false*/ // if numerical, is the port number, otherwise should be false
        // to indicate use of passive mode
    };
    extend(true, this.options, options);
    if (typeof this.options.debug === 'function')
        debug = this.options.debug;
};

util.inherits(FTP, EventEmitter);

(function() {
    var XRegExp = require('./xregexp'),
        reXListUnix = XRegExp.cache('^(?<type>[\\-ld])(?<permission>([\\-r][\\-w][\\-xs]){3})\\s+(?<inodes>\\d+)\\s+(?<owner>\\w+)\\s+(?<group>\\w+)\\s+(?<size>\\d+)\\s+(?<timestamp>((?<month1>\\w{3})\\s+(?<date1>\\d{1,2})\\s+(?<hour>\\d{1,2}):(?<minute>\\d{2}))|((?<month2>\\w{3})\\s+(?<date2>\\d{1,2})\\s+(?<year>\\d{4})))\\s+(?<name>.+)$'),
        reXListMSDOS = XRegExp.cache('^(?<month>\\d{2})(?:\\-|\\/)(?<date>\\d{2})(?:\\-|\\/)(?<year>\\d{2,4})\\s+(?<hour>\\d{2}):(?<minute>\\d{2})\\s{0,1}(?<ampm>[AaMmPp]{1,2})\\s+(?:(?<size>\\d+)|(?<isdir>\\<DIR\\>))\\s+(?<name>.+)$'),
        reXTimeval = XRegExp.cache('^(?<year>\\d{4})(?<month>\\d{2})(?<date>\\d{2})(?<hour>\\d{2})(?<minute>\\d{2})(?<second>\\d+)$'),
        reKV = /(.+?)=(.+?);/;
    
    this.end = function() {
        if (this.$socket)
            this.$socket.end();
        if (this.$dataSock)
            this.$dataSock.end();

        this.$socket = null;
        this.$dataSock = null;
    };
    this.connect = function(port, host) {
        var self = this, socket = this.$socket, curData = '';
        this.options.port = port = port || this.options.port;
        this.options.host = host = host || this.options.host;

        this.$feat = {};

        if (socket)
            socket.end();
        if (this.$dataSock)
            this.$dataSock.end();

        var connTimeout = setTimeout(function() {
            self.$socket.destroy();
            self.$socket = null;
            self.emit('timeout');
        }, this.options.connTimeout);
        
        socket = this.$socket = net.createConnection(port, host);
        socket.setEncoding('utf8');
        socket.setTimeout(0);
        socket.on('connect', function() {
            clearTimeout(connTimeout);
            if (debug)
                debug('Connected');
        });
        socket.on('end', function() {
            if (debug)
                debug('Disconnected');
            if (self.$dataSocket)
                self.$dataSocket.end();
            self.emit('end');
        });
        socket.on('close', function(hasError) {
            clearTimeout(connTimeout);
            if (self.$dataSocket)
                self.$dataSocket.end();
            self.emit('close', hasError);
        });
        socket.on('error', function(err) {
            self.emit('error', err);
        });
        socket.on('data', function(data) {
            curData += data;
            if (/(?:\r\n|\n)$/.test(curData)) {
                var resps = FtpHelpers.parseResponses(curData.split(/\r\n|\n/)),
                    processNext = false;
                
                if (resps.length === 0)
                    return;
                
                curData = '';
                if (debug) {
                    for (var i=0, len=resps.length; i < len; ++i)
                        debug('Response: code = ' + resps[i][0]
                            + (resps[i][1] ? '; text = ' + util.inspect(resps[i][1]) : ''));
                }

                for (var i=0, code, text, group, len = resps.length; i < len; ++i) {
                    code = resps[i][0];
                    text = resps[i][1];
                    group = FtpHelpers.getGroup(code); // second digit

                    if (!self.$state) {
                        if (code === 220) {
                            self.$state = 'connected';
                            self.send('FEAT', function(err, text) {
                                if (!err && /\r\n|\n/.test(text)) {
                                    var feats = text.split(/\r\n|\n/);
                                    feats.shift(); // "Features:"
                                    feats.pop(); // "End"
                                    for (var i=0, sp, len = feats.length; i < len; ++i) {
                                        feats[i] = feats[i].trim();
                                        if ((sp = feats[i].indexOf(' ')) > -1)
                                            self.$feat[feats[i].substring(0, sp).toUpperCase()] = feats[i].substring(sp + 1);
                                        else
                                            self.$feat[feats[i].toUpperCase()] = true;
                                    }
                                    if (debug)
                                        debug('Features: ' + util.inspect(self.$feat));
                                    self.emit('feat', self.$feat);
                                }
                                self.emit('connect');
                            });
                        } else {
                             self.emit('error', new Error('Did not receive service ready response'));
                        }
                        return;
                    }
                    
                    if (code >= 200 && !processNext)
                        processNext = true;
                    else if (code < 200)
                        continue;

                    if (group === 0) {
                        // all in here are errors except 200
                        if (code === 200)
                            self.$executeNext();
                        else
                            self.$executeNext(FtpHelpers.makeError(code, text));
                    } else if (group === 1) {
                        // informational group
                        if (code >= 211 && code <= 215)
                            self.$executeNext(text);
                        else
                            self.$executeNext(FtpHelpers.makeError(code, text));
                    } else if (group === 2) {
                        // control/data connection-related
                        if (code === 226) {
                            // closing data connection, file action request successful
                            self.$executeNext();
                        } else if (code === 227) {
                            // server entering passive mode
                            var parsed = text.match(/([\d]+),([\d]+),([\d]+),([\d]+),([-\d]+),([-\d]+)/);
                            if (!parsed)
                                throw new Error('Could not parse passive mode response: ' + text);
                            self.$pasvIP = parsed[1] + '.' + parsed[2] + '.' + parsed[3] + '.' + parsed[4];
                            self.$pasvPort = (parseInt(parsed[5]) * 256) + parseInt(parsed[6]);
                            self.$pasvConnect();
                            return;
                        } else
                            self.$executeNext(FtpHelpers.makeError(code, text));
                    } else if (group === 3) {
                        // authentication-related
                        if (code === 331 || code === 230)
                            self.$executeNext((code === 331));
                        else
                            self.$executeNext(FtpHelpers.makeError(code, text));
                        } else if (group === 5) { // group 4 is unused
                            // server file system state
                            if (code === 250 && self.$queue[0][0] === 'MLST')
                                self.$executeNext(text);
                            else if (code === 250 || code === 350)
                                self.$executeNext();
                            else if (code === 257) {
                                var path = text.match(/(?:^|\s)\"(.*)\"(?:$|\s)/);
                                if (path)
                                    path = path[1].replace(/\"\"/g, '"');
                                else
                                    path = text;
                                self.$executeNext(path);
                            } else
                                self.$executeNext(FtpHelpers.makeError(code, text));
                        }
                        if (processNext)
                            self.send();
                    }
                }
        });
    };
    /** Standard features */
    this.auth = function(user, password, callback) {
        if (this.$state !== 'connected')
            return false;
        
        if (typeof user === 'function') {
            callback = user;
            user = 'anonymous';
            password = 'anonymous@';
        } else if (typeof password === 'function') {
            callback = password;
            password = 'anonymous@';
        }
        var cmds = [['USER', user], ['PASS', password]], cur = 0, self = this,
            next = function(err, result) {
                if (err)
                    return callback(err);

                if (result === true) {
                    if (!self.send(cmds[cur][0], cmds[cur][1], next))
                        return callback(new Error('Connection severed'));
                    ++cur;
                } else if (result === false) { // logged in
                    cur = 0;
                    self.$state = 'authorized';
                    if (!self.send('TYPE', 'I', callback))
                        return callback(new Error('Connection severed'));
                }
            };
        
        next(null, true);
        return true;
    };
    this.pwd = function(callback) {
        return (this.$state !== 'authorized')
            ? false
            : this.send('PWD', callback)
    };
    this.cwd = function(path, callback) {
        return (this.$state !== 'authorized')
            ? false
            : this.send('CWD', path, callback);
    };
    /** File functionality */
    this.get = function(path, callback) {
        if (this.$state !== 'authorized')
            return false;

        var self = this;
        return this.send('PASV', function(err, stream) {
            if (err)
                return callback(err);

            var result = self.send('RETR', path, function(err) {
                if (err)
                    return stream.emit('error', err);
                
                stream.emit('success');
            });
            if (result)
                callback(undefined, stream);
            else
                callback(new Error('Connection severed'));
        });
    };
    this.put = function(instream, destpath, callback) {
        if (this.$state !== 'authorized' || !instream.readable)
            return false;

        instream.pause();

        var self = this;
        return this.send('PASV', function(err, outstream) { // net.createConnection :: out-stream coming from FTP conn.
            if (err)
                return callback(err);

            var result = self.send('STOR', destpath, callback);
            if (result)
                instream.pipe(outstream);
            else
                callback(new Error('Connection severed'));
        });
    };
    this.append = function(instream, destpath, callback) {
        if (this.$state !== 'authorized' || !instream.readable)
            return false;

        instream.pause();

        var self = this;
        return this.send('PASV', function(err, outstream) {
            if (err)
                return callback(err);

            var result = self.send('APPE', destpath, callback);
            if (result)
                instream.pipe(outstream);
            else
                callback(new Error('Connection severed'));
        });
    };
    this.copy = function(origpath, destpath, callback) {
        if (this.$state !== 'authorized')
            return false;
        //@todo dir copy involves deep recursive copying
    };
    this['delete'] = function(path, callback) {
        return (this.$state !== 'authorized')
            ? false
            : this.send('DELE', path, callback);
    };
    this.rename = function(pathFrom, pathTo, callback) {
        if (this.$state !== 'authorized')
            return false;

        var self = this;
        return this.send('RNFR', pathFrom, function(err) {
            if (err)
                return callback(err);

            if (!self.send('RNTO', pathTo, callback))
                callback(new Error('Connection severed'));
        });
    };
    /** Directory functionality */
    this.mkdir = function(path, callback) {
        return (this.$state !== 'authorized')
            ? false
            : this.send('MKD', path, callback);
    };
    this.rmdir = function(path, callback) {
        return (this.$state !== 'authorized')
            ? false
            : this.send('RMD', path, callback);
    };
    /** Convenience methods */
    var Stat = function(struct) {
        this.uid    = struct.owner;
        this.gid    = struct.group;
        this.date   = struct.date;
        this.time   = struct.time;
        this.size   = struct.size;
        this.name   = struct.name;
        this.rights = struct.rights;

        /**
        * @type {Boolean}
        */
        this.isFile = function() {
            return struct.type == "-";
        };
        /**
        * @type {Boolean}
        */
        this.isDirectory = function() {
            return struct.type == "d";
        };
        /**
        * @type {Boolean}
        */
        this.isBlockDevice = function() {
            return struct.type == "b";
        };
        /**
        * @type {Boolean}
        */
        this.isCharacterDevice = function() {
            return struct.type == "c";
        };
        /**
        * @type {Boolean}
        */
        this.isSymbolicLink = function() {
            return struct.type == "l";
        };
        /**
        * @type {Boolean}
        */
        this.isFIFO = function() {
            return struct.type == "p";
        };
        /**
        * @type {Boolean}
        */
        this.isSocket = function() {
            return struct.type == "s";
        };
    };
    this.readdir = function(path, callback) {
        var self = this;
        if (debug)
            debug('READ DIR ' + path);
            
        this.list(path, function(err, emitter) {
            if (err)
                return callback(err);
                
            var nodes = [];
            emitter.on('entry', function(entry) {
                var item = new Stat(entry);
                var p = item.name;
                nodes.push(p.substr(p.lastIndexOf("/") + 1));
            });
            emitter.on('error', function(err) { // Under normal circumstances this shouldn't happen.
                self.$socket.end();
                callback('Error during LIST(): ' + util.inspect(err));
            });
            emitter.on('success', function() {
                callback(null, nodes);
            });
        });
    };
    this.stat = this.lstat = this.fstat = function(path, callback) {
        var self = this,
            parts = path.split("/"),
            node = parts.pop(),
            root = parts.join("/");
        
        if (root.charAt(0) != "/") {
            this.pwd(function(err, pwd) {
                if (err)
                    return callback(err);
                pwd = pwd.replace(/[\/]+$/, "");
                root = pwd + "/" + root.replace(/^[\/]+/, "");
                afterPwd();
            });
        } else
            afterPwd();

        function afterPwd() {
            if (debug)
                debug('STAT ' + root);
            // List and add to first matching result to the list
            self.list(root, function(err, emitter) {
                if (err)
                    return callback(err); // Error('Unable to retrieve node status', root);
                
                var list = [];
                emitter.on('entry', function(entry) {
                    entry = new Stat(entry);
                    if (entry.name === node)
                        list.push(entry);
                });
                emitter.on('error', function(err) { // Under normal circumstances this shouldn't happen.
                    self.$socket.end();
                    callback('Error during LIST(): ' + util.inspect(err));
                });
                emitter.on('success', function() {
                    if (list.length === 0)
                        return callback("File at location " + path + " not found");
                    callback(null, list[0]);
                });
            });
        }
    };
    /** FTP true list command */
    this.list = function(path, callback) {
        if (this.$state !== 'authorized')
            return false;

        if (typeof path === 'function') {
            callback = path;
            path = undefined;
        }
        var self = this, emitter = new EventEmitter(), params;
        /*if (params = this.$feat['MLST']) {
        var type = undefined,
        cbTemp = function(err, text) {
        if (err) {
        if (!type && e.code === 550) { // path was a file not a dir.
        type = 'file';
        if (!self.send('MLST', path, cbTemp))
        return callback(new Error('Connection severed'));
        return;
        } else if (!type && e.code === 425) {
        type = 'pasv';
        if (!self.$pasvGetLines(emitter, 'MLSD', cbTemp))
        return callback(new Error('Connection severed'));
        return;
        }
        if (type === 'dir')
        return emitter.emit('error', err);
        else
        return callback(err);
        }
        if (type === 'file') {
        callback(undefined, emitter);
        var lines = text.split(/\r\n|\n/), result;
        lines.shift();
        lines.pop();
        lines.pop();
        result = FtpHelpers.parseMList(lines[0]);
        emitter.emit((typeof result === 'string' ? 'raw' : 'entry'), result);
        emitter.emit('end');
        emitter.emit('success');
        } else if (type === 'pasv') {
        type = 'dir';
        if (path)
        r = self.send('MLSD', path, cbTemp);
        else
        r = self.send('MLSD', cbTemp);
        if (r)
        callback(undefined, emitter);
        else
        callbac(new Error('Connection severed'));
        } else if (type === 'dir')
        emitter.emit('success');
        };
        if (path)
        return this.send('MLSD', path, cbTemp);
        else
        return this.send('MLSD', cbTemp);
        } else {*/
            // Otherwise use the standard way of fetching a listing
            this.$pasvGetLines(emitter, 'LIST', function(err) {
                if (err)
                    return callback(err);
                
                var result,
                    cbTemp = function(err) {
                        if (err)
                            return emitter.emit('error', err);
                        emitter.emit('success');
                    };
                if (path)
                    result = self.send('LIST', path, cbTemp);
                else
                    result = self.send('LIST', cbTemp);
                if (result)
                    callback(undefined, emitter);
                else
                    callback(new Error('Connection severed'));
            });
        //}
    };
    
    this.system = function(callback) {
        return (this.$state !== 'authorized')
            ? false
            : this.send('SYST', callback);
    };
    this.status = function(callback) {
        return (this.$state !== 'authorized')
            ? false
            : this.send('STAT', callback);
    };
    /** Extended features */
    this.chmod = function(path, mode, callback) {
        return (this.$state !== 'authorized')
            ? false
            : this.send('CHMOD', [mode, path].join(' '), callback);
    };
    this.size = function(path, callback) {
      return (this.$state !== 'authorized' || !this.$feat['SIZE'])
        ? false
        : this.send('SIZE', path, callback);
    };
    this.lastMod = function(path, callback) {
        if (this.$state !== 'authorized' || !this.$feat['MDTM'])
            return false;
        
        return this.send('MDTM', path, function(err, text) {
            if (err)
                return callback(err);
            
            var val = reXTimeval.exec(text);
            if (!val)
                return callback(new Error('Invalid date/time format from server'));
                
            var date = {
                year: parseInt(val.year, 10),
                month: parseInt(val.month, 10),
                date: parseInt(val.date, 10)
            };
            var time = {
                hour: parseInt(val.hour, 10),
                minute: parseInt(val.minute, 10),
                second: parseFloat(val.second, 10)
            };
            var joinDateArr = [], joinTimeArr = [];
            for (var d in date)
                joinDateArr.push(date[d]);
            for (var t in time)
                joinTimeArr.push(time[t]);
            
            var mdtm = new Date(joinDateArr.join(' ') + ' ' + joinTimeArr.join(':'))
            callback(undefined, mdtm);
        });
    };
    this.restart = function(offset, callback) {
        return (this.$state !== 'authorized' || !this.$feat['REST'] || !(/STREAM/i.test(this.$feat['REST'])))
            ? false
            : this.send('REST', offset, callback);
    };
    /** Internal helper methods */
    this.send = function(cmd, params, callback) {
        if (!this.$socket || !this.$socket.writable)
            return false;

        if (cmd) {
            cmd = (''+cmd).toUpperCase();
            if (typeof params === 'function') {
                callback = params;
                params = undefined;
            }
            if (!params)
                this.$queue.push([cmd, callback]);
            else
                this.$queue.push([cmd, params, callback]);
        }
        
        if (this.$queue.length) { 
            var fullcmd = this.$queue[0][0] + (this.$queue[0].length === 3 ? ' ' + this.$queue[0][1] : '');
            if (debug)
                debug('> ' + fullcmd);
            // WRITE COMMAND AND ARGUMENTS TO THE SOCKET:
            this.$socket.write(fullcmd + '\r\n');
        }

        return true;
    };
    this.$pasvGetLines = function(emitter, type, callback) {
        return this.send('PASV', function(err, stream) {
            if (err)
                return callback(err);
            else if (!emitter || typeof stream !== 'object')
                return emitter.emit('error', new Error('Connection severed'));
            
            var curData = '', lines;
            stream.setEncoding('utf8');
            // Note: stream will start transfering by cmd 'LIST'
            stream.on('data', function(data) {
                curData += data;
                if (/\r\n|\n/.test(curData)) {
                    if (curData[curData.length-1] === '\n') {
                        lines = curData.split(/\r\n|\n/);
                        curData = '';
                    } else {
                        var pos = curData.lastIndexOf('\r\n');
                        if (pos === -1)
                            pos = curData.lastIndexOf('\n');
                        lines = curData.substring(0, pos).split(/\r\n|\n/);
                        curData = curData.substring(pos + 1);
                    }
                    FtpHelpers.processDirLines(lines, emitter, type);
                }
            });
            stream.on('end', function() {
                emitter.emit('end');
            });
            stream.on('error', function(err) {
                emitter.emit('error', err);
            });
            
            callback();
        });
    };
    this.$pasvConnect = function() {
        if (!this.$pasvPort)
            return false;

        var self = this;
        var pasvTimeout = setTimeout(function() {
            var result = self.send('ABOR', function(err) {
                if (err)
                    return self.$executeNext(err);
                self.$dataSock.destroy();
                self.$dataSock = self.$pasvPort = self.$pasvIP = null;
                self.$executeNext(new Error('(PASV) Data connection timed out while connecting'));
            });
            if (!result)
                self.$executeNext(new Error('Connection severed'));
        }, this.options.connTimeout);

        if (debug)
            debug('(PASV) About to attempt data connection to: ' + this.$pasvIP + ':' + this.$pasvPort);
        // Create new passive stream.
        this.$dataSock = net.createConnection(this.$pasvPort, this.$pasvIP);

        this.$dataSock.on('connect', function() {
            clearTimeout(pasvTimeout);
            if (debug)
                debug('(PASV) Data connection successful');
            self.$executeNext(self.$dataSock);
        });
        this.$dataSock.on('end', function() {
            if (debug)
                debug('(PASV) Data connection closed');
            self.$dataSock = self.$pasvPort = self.$pasvIP = null;
        });
        this.$dataSock.on('close', function() {
            clearTimeout(pasvTimeout);
        });
        this.$dataSock.on('error', function(err) {
            if (debug)
                debug('(PASV) Error: ' + err);
            self.$executeNext(err);
            self.$dataSock = self.$pasvPort = self.$pasvIP = null;
        });

        return true;
    };
    this.$executeNext = function(result) {
        if (!this.$queue.length)
            return;

        var req = this.$queue.shift(),
            callback = (req.length === 3 ? req[2] : req[1]);
        
        if (!callback)
            return;

        if (result instanceof Error) {
            process.nextTick(function() {
                callback(result);
            });
        } else if (typeof result !== 'undefined') {
            process.nextTick(function() {
                callback(undefined, result);
            });
        } else
            process.nextTick(callback);
    };
    /** Helper functions */
    var FtpHelpers = {
        processDirLines: function(lines, emitter, type) {
            for (var i=0,result,len=lines.length; i<len; ++i) {
                if (lines[i].length) {
                    if (debug)
                        debug('(PASV) Got ' + type + ' line: ' + lines[i]);
                    if (type === 'LIST')
                        result = FtpHelpers.parseList(lines[i]);
                    else if (type === 'MLSD')
                        result = FtpHelpers.parseMList(lines[i], numFields);

                    emitter.emit((typeof result === 'string' ? 'raw' : 'entry'), result);
                }
            }
        },
        parseResponses: function(lines) {
            var responses = [],
                multiline = '';

            for (var i=0, match, len=lines.length; i < len; ++i) {
                if (match = lines[i].match(/^(\d{3})(?:$|(\s|\-)(.+))/)) {
                    if (match[2] === '-') {
                        if (match[3])
                            multiline += match[3] + '\n';
                        continue;
                    } else
                        match[3] = (match[3] ? multiline + match[3] : multiline);

                    if (match[3].length)
                        responses.push([parseInt(match[1]), match[3]]);
                    else
                        responses.push([parseInt(match[1])]);
                    multiline = '';
                } else
                    multiline += lines[i] + '\n';
            }
            return responses;
        },
        parseMList: function(line) {
            var ret, result = line.trim().split(reKV);

            if (result && result.length > 0) {
                ret = {};
                if (result.length === 1)
                    ret.name = result[0].trim();
                else {
                    var i = 1;
                    for (var k,v,len=result.length; i<len; i+=3) {
                        k = result[i];
                        v = result[i+1];
                        ret[k] = v;
                    }
                    ret.name = result[result.length-1].trim();
                }
            } else
                ret = line;

            return ret;
        },
        makeError: function(code, text) {
            var err = new Error('Server Error: ' + code + (text ? ' ' + text : ''));
            err.code = code;
            err.text = text;
            return err;
        },
        getGroup: function(code) {
            return parseInt(code/10)%10;
        },
        parseList: function(line) {
            var ret,
                info,
                thisYear = (new Date()).getFullYear(),
                months = {
                    jan: 1,
                    feb: 2,
                    mar: 3,
                    apr: 4,
                    may: 5,
                    jun: 6,
                    jul: 7,
                    aug: 8,
                    sep: 9,
                    oct: 10,
                    nov: 11,
                    dec: 12
                };

            if (ret = reXListUnix.exec(line)) {
                info = {};
                info.type = ret.type;
                info.rights = {};
                info.rights.user = ret.permission.substring(0, 3).replace('-', '');
                info.rights.group = ret.permission.substring(3, 6).replace('-', '');
                info.rights.other = ret.permission.substring(6, 9).replace('-', '');
                info.owner = ret.owner;
                info.group = ret.group;
                info.size = ret.size;
                info.date = {};
                if (typeof ret.month1 !== 'undefined') {
                    info.date.month = parseInt(months[ret.month1.toLowerCase()], 10);
                    info.date.date = parseInt(ret.date1, 10);
                    info.date.year = thisYear;
                    info.time = {};
                    info.time.hour = parseInt(ret.hour, 10);
                    info.time.minute = parseInt(ret.minute, 10);
                } else if (typeof ret.month2 !== 'undefined') {
                    info.date.month = parseInt(months[ret.month2.toLowerCase()], 10);
                    info.date.date = parseInt(ret.date2, 10);
                    info.date.year = parseInt(ret.year, 10);
                }
                if (ret.type === 'l') {
                    var pos = ret.name.indexOf(' -> ');
                    info.name = ret.name.substring(0, pos);
                    info.target = ret.name.substring(pos+4);
                } else
                    info.name = ret.name;
                ret = info;
            } else if (ret = reXListMSDOS.exec(line)) {
                info = {};
                info.type = (ret.isdir ? 'd' : '-');
                info.size = (ret.isdir ? '0' : ret.size);
                info.date = {};
                info.date.month = parseInt(ret.month, 10);
                info.date.date = parseInt(ret.date, 10);
                info.date.year = parseInt(ret.year, 10);
                info.time = {};
                info.time.hour = parseInt(ret.hour, 10);
                info.time.minute = parseInt(ret.minute, 10);
                if (ret.ampm[0].toLowerCase() === 'p' && info.time.hour < 12)
                    info.time.hour += 12;
                else if (ret.ampm[0].toLowerCase() === 'a' && info.time.hour === 12)
                    info.time.hour = 0;
                info.name = ret.name;
                ret = info;
            } else
                ret = line; // could not parse, so at least give the end user a chance to look at the raw listing themselves

            return ret;
        }
    };
}).call(FTP.prototype);

/**
* Adopted from jquery's extend method. Under the terms of MIT License.
*
* http://code.jquery.com/jquery-1.4.2.js
*
* Modified by Brian White to use Array.isArray instead of the custom isArray method
*/
function extend() {
    // copy reference to target object
    var target = arguments[0] || {}, i = 1, length = arguments.length, deep = false, options, name, src, copy;
    // Handle a deep copy situation
    if (typeof target === "boolean") {
        deep = target;
        target = arguments[1] || {};
        // skip the boolean and the target
        i = 2;
    }
    // Handle case when target is a string or something (possible in deep copy)
    if (typeof target !== "object" && !typeof target === 'function')
    target = {};
    var isPlainObject = function(obj) {
        // Must be an Object.
        // Because of IE, we also have to check the presence of the constructor property.
        // Make sure that DOM nodes and window objects don't pass through, as well
        if (!obj || toString.call(obj) !== "[object Object]" || obj.nodeType || obj.setInterval)
        return false;
        var has_own_constructor = hasOwnProperty.call(obj, "constructor");
        var has_is_property_of_method = hasOwnProperty.call(obj.constructor.prototype, "isPrototypeOf");
        // Not own constructor property must be Object
        if (obj.constructor && !has_own_constructor && !has_is_property_of_method)
        return false;
        // Own properties are enumerated firstly, so to speed up,
        // if last one is own, then all properties are own.
        var last_key;
        for (key in obj)
            last_key = key;
        return typeof last_key === "undefined" || hasOwnProperty.call(obj, last_key);
    };
    for (; i < length; i++) {
        // Only deal with non-null/undefined values
        if ((options = arguments[i]) !== null) {
            // Extend the base object
            for (name in options) {
                src = target[name];
                copy = options[name];
                // Prevent never-ending loop
                if (target === copy)
                continue;
                // Recurse if we're merging object literal values or arrays
                if (deep && copy && (isPlainObject(copy) || Array.isArray(copy))) {
                    var clone = src && (isPlainObject(src) || Array.isArray(src)) ? src : Array.isArray(copy) ? [] : {};
                    // Never move original objects, clone them
                    target[name] = extend(deep, clone, copy);
                    // Don't bring in undefined values
                    } else if (typeof copy !== "undefined")
                    target[name] = copy;
                }
            }
        }
        // Return the modified object
        return target;
    }

// Target API:
//
//  var s = require('net').createStream(25, 'smtp.example.com');
//  s.on('connect', function() {
//   require('starttls')(s, options, function() {
//      if (!s.authorized) {
//        s.destroy();
//        return;
//      }
//
//      s.end("hello world\n");
//    });
//  });
function starttls(socket, options, cb) {
    var sslcontext = require('crypto').createCredentials(options),
    pair = require('tls').createSecurePair(sslcontext, false),
    cleartext = $pipe(pair, socket);
    pair.on('secure', function() {
        var verifyError = pair._ssl.verifyError();
        if (verifyError) {
            cleartext.authorized = false;
            cleartext.authorizationError = verifyError;
            } else
            cleartext.authorized = true;
            if (cb)
            cb();
    });
    cleartext._controlReleased = true;
    return cleartext;
}

function $pipe(pair, socket) {
    pair.encrypted.pipe(socket);
    socket.pipe(pair.encrypted);

    pair.fd = socket.fd;
    var cleartext = pair.cleartext;
    cleartext.socket = socket;
    cleartext.encrypted = pair.encrypted;
    cleartext.authorized = false;

    function onerror(e) {
        if (cleartext._controlReleased)
        cleartext.emit('error', e);
    }
    function onclose() {
        socket.removeListener('error', onerror);
        socket.removeListener('close', onclose);
    }
    socket.on('error', onerror);
    socket.on('close', onclose);
    return cleartext;
}