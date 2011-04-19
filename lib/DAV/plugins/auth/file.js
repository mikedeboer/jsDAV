/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
var jsDAV                             = require("./../../../jsdav"),
    jsDAV_ServerPlugin                = require("./../../plugin").jsDAV_ServerPlugin,
    jsDAV_Auth_Backend_AbstractDigest = require("./abstractDigest"),

    Exc  = require("./../../exceptions"),
    Fs   = require("fs"),
    Util = require("./../../util");

/**
 * This is an authentication backend that uses a file to manage passwords.
 *
 * The backend file must conform to Apache's htdigest format
 */
function jsDAV_Auth_Backend_File(filename) {
    this.filename = filename;
}

(function() {
    /**
     * List of users 
     * 
     * @var array
     */
    this.users = null;

    /**
     * Loads an htdigest-formatted file. This method can be called multiple times if
     * more than 1 file is used.
     * 
     * @param  {string} filename 
     * @return {void}
     */
    this.loadFile = function(filename, callback) {
        var _self = this;
        Fs.readFile(filename, "utf8", function(err, data) {
            if (err)
                return callback(err);
            data.split("\n").forEach(function(line) {
                var parts = line.split(":");
                if (line.length !== 3) 
                    callback(new jsDAV_Exception("Malformed htdigest file. Every line should contain 2 colons"));
                
                var username = parts[0],
                    realm    = parts[1],
                    A1       = parts[2];
    
                if (!/^[a-zA-Z0-9]{32}/.test(A1))
                    return callback(new jsDAV_Exception("Malformed htdigest file. Invalid md5 hash"));
                    
                _self.users[username] = A1;
                callback();
            });
        });
    };

    /**
     * Returns a users' information
     * 
     * @param  {string} realm 
     * @param  {string} username 
     * @return {string}
     */
    this.getDigestHash = function(realm, username, callback) {
        if (this.filename && !this.users)
            this.loadFile(this.filename, next);
        else
            next();

        var _self = this;
        function next(err) {
            if (err)
                return callback(err);
            callback(null, _self.users[username] ? _self.users[username] : false);
        }
    };
}).call(jsDAV_Auth_Backend_File.prototype = new jsDAV_Auth_Backend_AbstractDigest());

module.exports = jsDAV_Auth_Backend_File;
