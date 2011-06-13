/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax.org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV = require("./../lib/jsdav");

jsDAV.debugMode = true;

var host = "ftp.secureftp-test.com";
var username = "test";
var password = "test";

jsDAV.createServer({
    type: "ftp",
    node: "",
    ftp: {
        host: host,
        user: username,
        pass: password,
        port: 21,
        connTimeout: 10000,
        debug: true
    }
}, 8000);

/*

var FTPClient = require('../support/node-ftp/ftp.js'), util = require('util'), conn;

function formatDate(d) {
  return (d.year < 10 ? '0' : '') + d.year + '-' + (d.month < 10 ? '0' : '')
         + d.month + '-' + (d.date < 10 ? '0' : '') + d.date;
}

conn = new FTPClient({ host: host });

conn.on('connect', function() {
  conn.auth(username, password, function(e) {
    if (e)
      throw e;
    conn.list('/subdir1', function(e, iter) {
      if (e) {
        console.log(e);
        throw e;
        }
      var begin = false;
      iter.on('entry', function(entry) {
        if (!begin) {
          begin = true;
          console.log('<start of directory list>');
        }
        if (entry.type === 'l')
          entry.type = 'LINK';
        else if (entry.type === '-')
          entry.type = 'FILE';
        else if (entry.type === 'd')
          entry.type = 'DIR.';
        console.log(' ' + entry.type + ' ' + entry.size + ' '
                      + formatDate(entry.date) + ' ' + entry.name);
      });
      iter.on('raw', function(s) {
        console.log('<raw entry>: ' + s);
      });
      iter.on('end', function() {
        console.log('<end of directory list>');
      });
      iter.on('error', function(e) {
        console.log('ERROR during list(): ' + util.inspect(e));
        conn.end();
      });
      iter.on('success', function() {
        conn.end();
      });
    });
  });
});
conn.connect();

// jsDAV.createServer({
//     type: "sftp",
//     sftp: {
//         host: host,
//         prvKey: prvkey,
//         pubKey: pubkey,
//         user: username,
//         port: 22,
//         home: "/home/sshtest"
//     }
// }, 8000);

*/