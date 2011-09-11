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
    var users = null;

    /**
     * Loads an htdigest-formatted file. This method can be called multiple times if
     * more than 1 file is used.
     * 
     * @param  {string} filename 
     * @return {void}
     */
    this.loadFile = function(filename, cbloadfile) {
        var _self = this;
        users = {};
        Fs.readFile(filename, "utf8", function(err, data) {
            if (err)
                return cbloadfile(err);

            data.split("\n").forEach(function(line) {
                var parts = line.split(":");
                if (line.length !== 3) 
                    cbloadfile(new Exc.jsDAV_Exception("Malformed htdigest file. Every line should contain 2 colons"));
                
                var username = parts[0],
                    realm    = parts[1],
                    A1       = parts[2];
    
                if (!/^[a-zA-Z0-9]{32}/.test(A1))
                    return cbloadfile(new Exc.jsDAV_Exception("Malformed htdigest file. Invalid md5 hash"));
                    
                users[username] = A1;
                cbloadfile();
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
    this.getDigestHash = function(realm, username, cbgethash) {
        var _self = this;
        if (this.filename && !users)
            this.loadFile(this.filename, next);
        else
            next();

        function next(err) {
            if (err)
                return cbgethash(err);
            cbgethash(null, users[username] ? users[username] : false);
        }
    };
}).call(jsDAV_Auth_Backend_File.prototype = new jsDAV_Auth_Backend_AbstractDigest());

module.exports = jsDAV_Auth_Backend_File;
