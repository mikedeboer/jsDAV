/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
var jsDAV                             = require("./../../../jsdav"),
    jsDAV_ServerPlugin                = require("./../../plugin").jsDAV_ServerPlugin,
    jsDAV_Auth_Backend_AbstractDigest = require("./abstractDigest"),

    Exc  = require("./../../exceptions"),
    Fs   = require("fs"),
    Util = require("./../../util");

/**
 * This is an authentication backend that uses a redis database to manage passwords.
 */
function jsDAV_Auth_Backend_Redis(redisClient) {
    this.redisClient = redisClient;
}

(function() {
    /**
     * Returns a users' information
     * 
     * @param  {string} realm 
     * @param  {string} username 
     * @return {string}
     */
    this.getDigestHash = function(realm, username, cbdigest) {
        var _self = this;
        this.redisClient.get("u/" + realm + "/" + username, function(err, A1) {
            if (err)
                return cbdigest(err);
            cbdigest(null, A1.toString());
        });
    };
}).call(jsDAV_Auth_Backend_Redis.prototype = new jsDAV_Auth_Backend_AbstractDigest());

module.exports = jsDAV_Auth_Backend_Redis;
