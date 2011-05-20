/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV = require("./../lib/jsdav"),
    jsDAV_Locks_Backend_FS = require("./../lib/DAV/plugins/locks/fs");

jsDAV.debugMode = true;

jsDAV.createServer({
    node: __dirname + "/assets"/*,
    locksBackend: new jsDAV_Locks_Backend_FS(__dirname + "/assets")*/
}, 8000);
