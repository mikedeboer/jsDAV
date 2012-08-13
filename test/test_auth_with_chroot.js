/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax.org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @author Frédéric Langlade-Bellone <fred AT parapluie DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV = require("./../lib/jsdav"),
	jsDAV_Locks_Backend_FS = require("./../lib/DAV/plugins/locks/fs"),
	jsDAV_BasicAuthPlugin = require("./../lib/DAV/plugins/auth/abstractBasic"),
	jsDAV_Chroot_Plugin = require("./../lib/DAV/additional_plugins/chroot");

jsDAV.debugMode = true;


// Loading a blank auth plugin that is ok given any password
// [----------------
function jsDAV_Auth_Dummy(){
	//this.initialize();
};

(function(){
	this.validateUserPass = function(uname, passwd, cbvalidpass){
		cbvalidpass(true);
	};

}).call(jsDAV_Auth_Dummy.prototype = new jsDAV_BasicAuthPlugin());
// ----------------]


// You should try connecting as dir1, dir2, dir11. 
// If there is no folder corresponding to your user name, you won't be able to connect
jsDAV.createServer({
    node: __dirname + "/assets",
    locksBackend: new jsDAV_Locks_Backend_FS(__dirname + "/assets"),
    authBackend: new jsDAV_Auth_Dummy(),
    additionalPlugins: [jsDAV_Chroot_Plugin]
}, 8000);