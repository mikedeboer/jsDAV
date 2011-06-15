/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax.org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV = require("./../lib/jsdav");

jsDAV.debugMode = true;

var host = "moran.dreamhost.com";
var username = "luismerino";
var password = "12monkeys";

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