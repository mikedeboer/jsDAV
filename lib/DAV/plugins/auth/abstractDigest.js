/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_Auth_iBackend = require("./iBackend");

var Exc   = require("./../../../shared/exceptions");
var Util  = require("./../../../shared/util");

/**
 * These constants are used in setQOP();
 */
var QOP_AUTH    = 1;
var QOP_AUTHINT = 2;

/**
 * This method returns the full digest string.
 *
 * If the header could not be found, null will be returned
 *
 * @return mixed
 */
function getDigest(req) {
    // most other servers
    var digest = req.headers["authorization"];
    if (digest && digest.toLowerCase().indexOf("digest") === 0)
        return digest.substr(7);
    else
        return null;
}

/**
 * Parses the different pieces of the digest string into an array.
 *
 * This method returns false if an incomplete digest was supplied
 *
 * @param string digest
 * @return mixed
 */
function parseDigest(digest) {
    if (!digest)
        return false;
    // protect against missing data
    var needed_parts = {"nonce": 1, "nc": 1, "cnonce": 1, "qop": 1,
        "username": 1, "uri": 1, "response": 1};
    var data = {};

    digest.replace(/(\w+)=(?:(?:")([^"]+)"|([^\s,]+))/g, function(m, m1, m2, m3) {
        data[m1] = m2 ? m2 : m3;
        delete needed_parts[m1];
        return m;
    });

    return Object.keys(needed_parts).length ? false : data;
}

/**
 * HTTP Digest authentication backend class
 *
 * This class can be used by authentication objects wishing to use HTTP Digest
 * Most of the digest logic is handled, implementors just need to worry about
 * the getDigestHash method
 */
var jsDAV_Auth_Backend_AbstractDigest = module.exports = jsDAV_Auth_iBackend.extend({
    initialize: function() {
        this.nonce = Util.uniqid();
    },

    /**
     * This variable holds the currently logged in username.
     *
     * @var array|null
     */
    currentUser: null,

    digestParts: null,
    A1: null,
    qop: QOP_AUTH,

    /**
     * Gathers all information from the headers
     *
     * This method needs to be called prior to anything else.
     *
     * @return void
     */
    init: function(realm, req) {
        this.realm = realm;
        this.opaque = Util.md5(this.realm);
        this.digest = getDigest(req);
        this.digestParts = parseDigest(this.digest);
    },

    /**
     * Sets the quality of protection value.
     *
     * Possible values are:
     *   QOP_AUTH
     *   QOP_AUTHINT
     *
     * Multiple values can be specified using logical OR.
     *
     * QOP_AUTHINT ensures integrity of the request body, but this is not
     * supported by most HTTP clients. QOP_AUTHINT also requires the entire
     * request body to be md5'ed, which can put strains on CPU and memory.
     *
     * @param int qop
     * @return void
     */
    setQOP: function(qop) {
        this.qop = qop;
    },

    /**
     * Validates the user.
     *
     * The A1 parameter should be Util.md5(username + ':' + realm + ':' + password);
     *
     * @param string A1
     * @return bool
     */
    validateA1: function(handler, newA1, cbvalida1) {
        this.A1 = newA1;
        this.validate(handler, cbvalida1);
    },

    /**
     * Validates authentication through a password. The actual password must be provided here.
     * It is strongly recommended not store the password in plain-text and use validateA1 instead.
     *
     * @param string password
     * @return bool
     */
    validatePassword: function(handler, password, cbvalidpass) {
        this.A1 = Util.md5(this.digestParts["username"] + ":" + this.realm + ":" + password);
        this.validate(handler, cbvalidpass);
    },

    /**
     * Returns the username for the request
     *
     * @return string
     */
    getUsername: function() {
        return this.digestParts["username"];
    },

    /**
     * Validates the digest challenge
     *
     * @return bool
     */
    validate: function(handler, cbvalidate) {
        var req   = handler.httpRequest;
        var A2    = req.method + ":" + this.digestParts["uri"];
        var self  = this;

        if (this.digestParts["qop"] == "auth-int") {
            // Making sure we support this qop value
            if (!(this.qop & QOP_AUTHINT))
                return cbvalidate(false);
            // We need to add an md5 of the entire request body to the A2 part of the hash
            handler.getRequestBody("utf8", function(noop, body) {
                A2 += ":" + Util.md5(body);
                afterBody();
            });
        }
        else {
            // We need to make sure we support this qop value
            if (!(this.qop & QOP_AUTH))
                return cbvalidate(false);
            afterBody();
        }

        function afterBody() {
            A2 = Util.md5(A2);

            var validResponse = Util.md5(self.A1 + ":" + self.digestParts["nonce"] + ":"
                + self.digestParts["nc"] + ":" + self.digestParts["cnonce"] + ":"
                + self.digestParts["qop"] + ":" + A2);

            cbvalidate(self.digestParts["response"] == validResponse);
        }
    },

    /**
     * Returns a users digest hash based on the username and realm.
     *
     * If the user was not known, null must be returned.
     *
     * @param string realm
     * @param string username
     * @return string|null
     */
    getDigestHash: function(realm, username, cbdighash) {},

    /**
     * Returns an HTTP 401 header, forcing login
     *
     * This should be called when username and password are incorrect, or not supplied at all
     *
     * @return void
     */
    requireAuth: function(res, realm, err, cbreqauth) {
        var currQop = "";
        switch (this.qop) {
            case QOP_AUTH:
                currQop = "auth";
                break;
            case QOP_AUTHINT:
                currQop = "auth-int";
                break;
            case QOP_AUTH | QOP_AUTHINT:
                currQop = "auth,auth-int";
                break;
        }

        res.writeHead(401, {
            "WWW-Authenticate": "Digest realm=\"" + realm + "\",qop=\"" + currQop
                                + "\",nonce=\"" + this.nonce + "\",opaque=\""
                                + this.opaque + "\""
        });
        res.end();
        cbreqauth && cbreqauth(null, false);
    },

    /**
     * Authenticates the user based on the current request.
     *
     * If authentication is succesful, true must be returned.
     * If authentication fails, an exception must be thrown.
     *
     * @throws Sabre_DAV_Exception_NotAuthenticated
     * @return bool
     */
    authenticate: function(handler, realm, cbauth) {
        var req = handler.httpRequest;
        var res = handler.httpResponse;
        this.init(realm, req);

        var username = this.digestParts["username"];
        // No username was given
        if (!username)
            return this.requireAuth(res, realm, "No digest authentication headers were found", cbauth);

        var self = this;
        this.getDigestHash(realm, username, function(err, hash) {
            // If this was false, the user account didn't exist
            if (err || !hash)
                return self.requireAuth(res, realm, err || "The supplied username was not on file", cbauth);

            if (typeof hash != "string") {
                handler.handleError(new Exc.jsDAV_Exception(
                    "The returned value from getDigestHash must be a string or null"));
                return cbauth(null, false);
            }

            // If this was false, the password or part of the hash was incorrect.
            self.validateA1(handler, hash, function(isValid) {
                if (!isValid)
                    return self.requireAuth(res, realm, "Incorrect username", cbauth);

                self.currentUser = username;
                cbauth(null, true);
            });
        });
    },

    /**
     * Returns the currently logged in username.
     *
     * @return string|null
     */
    getCurrentUser: function(callback) {
        callback(null, this.currentUser);
    }
});
