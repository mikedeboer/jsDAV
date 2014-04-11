/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_FS_File = require("./../fs/file");
var jsDAV_FSExt_Node = require("./node");

var Fs = require("fs");
var Exc = require("./../../../shared/exceptions");
var Util = require("./../../../shared/util");

var jsDAV_FSExt_File = module.exports = jsDAV_FS_File.extend(jsDAV_FSExt_Node, {
    "delete": function(cbfsfiledel) {
    	var self = this;
    	Fs.unlink(this.path, function(err) {
    		if (err)
    			cbfsfiledel(err);
    		self.deleteResourceData(cbfsfiledel)
    	});
    }
});
