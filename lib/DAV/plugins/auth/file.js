/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_Auth_Backend_AbstractDigest = require("./abstractDigest");

var Exc = require("./../../../shared/exceptions");
var Fs  = require("fs");

/**
 * List of users
 *
 * @var array
 */
var users = null;

/**
 * This is an authentication backend that uses a file to manage passwords.
 *
 * The backend file must conform to Apache's htdigest format
 */
var jsDAV_Auth_Backend_File = module.exports = jsDAV_Auth_Backend_AbstractDigest.extend({
    initialize: function(filename) {
        jsDAV_Auth_Backend_AbstractDigest.initialize.call(this);
        this.filename = filename;
    },

    /**
     * Loads an htdigest-formatted file. This method can be called multiple times if
     * more than 1 file is used.
     *
     * @param  {string} filename
     * @return {void}
     */
    loadFile: function(filename, cbloadfile) {
        users = {};
        Fs.readFile(filename, "utf8", function(err, data) {
            if (err)
                return cbloadfile(err);

            var lines = data.split("\n");
            var i = 0;
            var l = lines.length;
            var line, parts, username, realm, A1;
            for (; i < l; ++i) {
                line = lines[i];
                // empty lines or simply newlines are allowed
                if (/^[\s\t\n\r]+$/.test(line))
                    continue;

                parts = line.split(":");
                if (parts.length !== 3)
                    return cbloadfile(new Exc.jsDAV_Exception("Malformed htdigest file. Every line should contain 2 colons"));

                username = parts[0];
                realm    = parts[1];
                A1       = parts[2];

                if (!/^[a-zA-Z0-9]{32}/.test(A1))
                    return cbloadfile(new Exc.jsDAV_Exception("Malformed htdigest file. Invalid md5 hash"));

                users[username] = A1;
            }

            cbloadfile();
        });
    },

    /**
     * Returns a users' information
     *
     * @param  {string} realm
     * @param  {string} username
     * @return {string}
     */
    getDigestHash: function(realm, username, cbgethash) {
        if (this.filename && !users)
            this.loadFile(this.filename, next);
        else
            next();

        function next(err) {
            if (err)
                return cbgethash(err);
            cbgethash(null, users[username] ? users[username] : false);
        }
    },
});
