/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @author Wouter Vroege <wouter AT woutervroege DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_Auth_Backend_AbstractDigest = require("./abstractDigest");

/**
 * This is an authentication backend that uses a mongo database to manage passwords.
 */
var jsDAV_Auth_Backend_Mongo = module.exports = jsDAV_Auth_Backend_AbstractDigest.extend({
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
        this.authBackend.collection(this.tableName).findOne({
            username: username
        }, function(err, doc) {
            if (err)
                return cbdigest(err);
            cbdigest(null, doc && doc.password);
        });
    }
});