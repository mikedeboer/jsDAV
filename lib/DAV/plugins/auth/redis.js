/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_Auth_Backend_AbstractDigest = require("./abstractDigest");

/**
 * This is an authentication backend that uses a redis database to manage passwords.
 */
var jsDAV_Auth_Backend_Redis = module.exports = jsDAV_Auth_Backend_AbstractDigest.extend({
    initialize: function(redisClient) {
        jsDAV_Auth_Backend_AbstractDigest.initialize.call(this);
        this.redisClient = redisClient;
    },

    /**
     * Returns a users' information
     *
     * @param  {string} realm
     * @param  {string} username
     * @return {string}
     */
    getDigestHash: function(realm, username, cbdigest) {
        this.redisClient.get("u/" + realm + "/" + username, function(err, A1) {
            if (err)
                return cbdigest(err);
            cbdigest(null, A1.toString());
        });
    }
});
