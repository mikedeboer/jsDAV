
# Node-Ftp
      
  Ftp client library with extended commands and response handling for passive and active modes
  built on [node](http://nodejs.org) and with [underscore](http://github.com/documentcloud/underscore).
  
# Usage
  
     var client = new Ftp({
         host: "some_known_host",
         port: 21
     });
     
     var basePath = "";
     client.on("connect", function(err) {
         client.auth("user", "pass", function(err) {
             if (err)
                throw err;
            client.pwd(function(err, workingDir) {
                if (err)
                    throw err;
                // Fetch basePath to issue all commands using the initial directory later
                basePath = workingDir;
                client.readdir(basePath, function(err, list) {
                    if (err)
                        throw err;
                    list.forEach(function(node){ console.log(node.name); });
                });
            });
         });
     });
     
     client.connect();

## Installation (coming soon)

    $ npm install node-ftp (coming soon)

## Quick Start

    Add the module to your file access point using require() and go for it!

## Features

  * Includes most FTP commands and normalizes their behavior
  * Fully tested parser for unix and ms-dos lists
  * Self-management of sockets for passive and active mode (coming soon) connections
  * Smart queueing for commands (sequential commands need to be issued without interruptions, such as RNFR -> RNTO), maybe a future version will improve this
  * Implements several advanced commands and extensions: SYST, STAT, CHMOD, SIZE, MDTM, IDLE, NOOP
  * Connection persistance using either NOOP if server implements it or LIST
  * Pre-implementation to deal with servers timezone's hour difference
  * Buffers are used in GET/PUT/APPEND instead of file streams
  * CWD is issued before relevant commands solving any problems with absolute paths containing whitespaces
  * High focus on performance and fast queuing
  * Friendly API

## Contributors

  * Based on initial implementation by [Brian White](http://mscdex.net/)
  * Luis Merino ([rendez](https://github.com/Rendez))
  * Sergi Mansilla ([sergi](https://github.com/sergi))

## API

  * end()
  * connect(port, host)
  * auth(user, password, callback)
  * pwd(callback)
  * cwd(path, callback)
  * get(path, callback)
  * put(buffer, destpath, callback, append)
  * append(buffer, destpath, callback)
  * delete(path, callback)
  * rename(pathFrom, pathTo, callback)
  * mkdir(path, callback)
  * rmdir(path, callback)
  * stat(path, callback)
  * readdir(path, callback) [uses retrLines]
  * retrLines(path, callback)
  * system(callback)
  * status(callback)
  * chmod(path, mode, callback)
  * size(path, callback)
  * lastMod(path, callback)
  * idle(path, callback)
  * noop(callback)
  * restart(offset, callback) [not tested]
  * send(cmd, params, callback) [command issuer]
  * Stat(struct) [object wrapper for parsed lines]

## Node Compatibility

    @todo

## Viewing Examples

    Create FTP projects at [Cloud9](c9.io)

## Running Tests

    @todo

## Feedback

    File bugs or other issues here.

## License 

(The MIT License)

Copyright (c) 2011 [Ajax.org B.V.](http://ajax.org) (info AT ajax DOT org)

Copyright (c) 2011 [Brian White](http://mscdex.net/)

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.