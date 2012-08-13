/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <fred AT parapluie DOT nl>
 * @author Frédéric Langlade-Bellone <fred AT parapluie DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var Util = require("../util"),
    jsDAV_ServerPlugin = require("../plugin").jsDAV_ServerPlugin,
    Path = require('path');

/**
 * Plugin to set base folder based on the logged in user
 * ie. if connected username is testuser, its root will be ${NODE}/testuser
 */
function jsDAV_Chroot_Plugin(handler){
	this.handler = handler;
	this.initialize();
}


(function(){
	this.initialize = function(){
		this.handler.addEventListener("userAuthenticated", this.userAuthenticated.bind(this));
	};

	/**
	 *  Once the user is logged in, we change the handler tree with one that starts at the right path
	 */
	this.userAuthenticated = function(e, username){
		if (username) {
			this.handler.tree = Util.extend({}, this.handler.server.tree);
			this.handler.tree.basePath = Path.join(this.handler.tree.basePath, username);
		}
		
		e.next();
	};

}).call(jsDAV_Chroot_Plugin.prototype = new jsDAV_ServerPlugin());

module.exports = jsDAV_Chroot_Plugin;
