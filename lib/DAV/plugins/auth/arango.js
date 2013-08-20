"use strict";

var jsDAV_Auth_Backend_AbstractDigest = require("./abstractDigest");

/**
 * This is an authentication backend that uses the arango database to manage passwords.
 */
var jsDAV_Auth_Backend_Arango = module.exports = jsDAV_Auth_Backend_AbstractDigest.extend({
    initialize: function (db) {
        jsDAV_Auth_Backend_AbstractDigest.initialize.call(this);
        this.db = db;
    },

    /**
     * Returns a users' information
     *
     * @param  {string} realm
     * @param  {string} username
     * @return {string}
     */
    getDigestHash: function (realm, username, cbdigest) {
    	this.db.simple.first({username:username,realm:realm})
    	.then(function(ret){
  			cbdigest(null,ret && ret.document && ret.document.password);	
  		},function(err){
        	return cbdigest(err);
        });  
    }
});