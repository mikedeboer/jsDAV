/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax.org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV = require("./../lib/jsdav");

jsDAV.debugMode = true;

jsDAV.createServer({
    node: __dirname + "/assets",
    plugins: ["auth", /*"browser", */"codesearch", "filelist", "filesearch", "locks", "mount", "temporaryfilefilter"]
}, 8000);