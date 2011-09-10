/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax.org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV = require("./../lib/jsdav"),
    jsDAV_Auth_Backend_File = require("./../lib/DAV/plugins/auth/file"),
    jsDAV_Locks_Backend_FS = require("./../lib/DAV/plugins/locks/fs");

jsDAV.debugMode = true;

jsDAV.createServer({
    node: __dirname + "/assets",
    locksBackend: new jsDAV_Locks_Backend_FS(__dirname + "/assets"),
    authBackend: new jsDAV_Auth_Backend_File(__dirname + "/assets/htdigest"),
    realm: "jsdavtest"
}, 8000);
