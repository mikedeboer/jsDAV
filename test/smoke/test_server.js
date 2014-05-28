/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax.org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV = require("./../lib/jsdav");
var jsDAV_FSExt_Tree = require("./../lib/DAV/backends/fsext/tree");
var jsDAV_Locks_Backend_FS = require("./../lib/DAV/plugins/locks/fs");

var Path = require("path");

// jsDAV.debugMode = true;

jsDAV.createServer({
    tree: jsDAV_FSExt_Tree.new(Path.join(__dirname, "assets")),
    locksBackend: jsDAV_Locks_Backend_FS.new(__dirname + "/assets")
}, 8000);
