/*
 * @package jsDAV
 * @subpackage DAVACL
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Daniel Laxar
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_Auth_Backend_AbstractDigest = require("./abstractDigest");

/**
 * This is an authentication backend that uses a postgre database to manage passwords.
 */
var jsDAV_Auth_Backend_Postgre = module.exports = jsDAV_Auth_Backend_AbstractDigest.extend({
	initialize: function (authBackend, tableName) {
		jsDAV_Auth_Backend_AbstractDigest.initialize.call(this);
		this.authBackend = authBackend;
		this.tableName = tableName || "users"
	},

	/**
	 * Returns a users' information
	 *
	 * @param  {string} realm
	 * @param  {string} username
	 * @return {string}
	 */
	getDigestHash: function (realm, username, cbdigest) {
		var queryText = 'SELECT * FROM ' + this.tableName + ' WHERE username=$1'
		var query = this.authBackend.query(queryText, [username], function (err, result) {
			if (err) {
				cbdigest(err);
			}
			else {
				if (result.rows.length > 0) {
					cbdigest(null, result.rows[0].password);
				}
				else if (result.rows.length == 0) {
					cbdigest(null, undefined);
				}
				else {
					cbdigest('Unexpected number of rows: ' + result.rows.length);
				}

			}
		});
	}
});
