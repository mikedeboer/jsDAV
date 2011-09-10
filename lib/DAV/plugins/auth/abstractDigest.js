/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV_Auth_iBackend = require("./iBackend").jsDAV_Auth_iBackend,

    Exc   = require("./../../exceptions"),
    Util  = require("./../../util");

/**
 * HTTP Digest authentication backend class
 *
 * This class can be used by authentication objects wishing to use HTTP Digest
 * Most of the digest logic is handled, implementors just need to worry about 
 * the getDigestHash method 
 */
function jsDAV_Auth_Backend_AbstractDigest() {
    this.nonce = Util.uniqid();
}

(function() {
    /**
     * This variable holds the currently logged in username.
     * 
     * @var array|null
     */
    this.currentUser = null;
    
    /**
     * These constants are used in setQOP();
     */
    var QOP_AUTH    = 1,
        QOP_AUTHINT = 2;

    this.digestParts =
    this.A1          = null;
    this.qop         = QOP_AUTH;

    /**
     * Gathers all information from the headers
     *
     * This method needs to be called prior to anything else.
     * 
     * @return void
     */
    this.init = function(realm, req) {
        this.realm  = realm;
        this.opaque = Util.md5(this.realm);
        this.digest      = getDigest(req);
        this.digestParts = parseDigest(this.digest);
    };

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
    this.setQOP = function(qop) {
        this.qop = qop;
    };

    /**
     * Validates the user.
     *
     * The A1 parameter should be Util.md5(username + ':' + realm + ':' + password);
     *
     * @param string A1 
     * @return bool 
     */
    this.validateA1 = function(handler, newA1, cbvalida1) {
        this.A1 = newA1;
        this.validate(handler, cbvalida1);
    };

    /**
     * Validates authentication through a password. The actual password must be provided here.
     * It is strongly recommended not store the password in plain-text and use validateA1 instead.
     * 
     * @param string password 
     * @return bool 
     */
    this.validatePassword = function(handler, password, cbvalidpass) {
        A1 = Util.md5(this.digestParts["username"] + ":" + this.realm + ":" + password);
        this.validate(handler, cbvalidpass);
    };

    /**
     * Returns the username for the request 
     * 
     * @return string 
     */
    this.getUsername = function() {
        return this.digestParts["username"];
    };

    /**
     * Validates the digest challenge 
     * 
     * @return bool 
     */
    this.validate = function(handler, cbvalidate) {
        var req   = handler.httpRequest,
            A2    = req.method + ":" + this.digestParts["uri"];

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
        }
        
        function afterBody() {
            A2 = Util.md5(A2);
    
            validResponse = Util.md5(this.A1 + ":" + this.digestParts["nonce"] + ":" 
                + this.digestParts["nc"] + ":" + this.digestParts["cnonce"] + ":" 
                + this.digestParts["qop"] + ":" + A2); 
    
            cbvalidate(this.digestParts["response"] == validResponse);
        }
    }

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
        needed_parts = {"nonce": 1, "nc": 1, "cnonce": 1, "qop": 1,
            "username": 1, "uri": 1, "response": 1};
        data = {};

        digest.replace(/(\w+)=(?:(?:")([^"]+)"|([^\s,]+))/g, function(m, m1, m2, m3) {
            data[m1] = m2 ? m2 : m3;
            delete needed_parts[m1];
            return m;
        });

        return Object.keys(needed_parts).length ? false : data; 
    }

    /**
     * Returns a users digest hash based on the username and realm.
     *
     * If the user was not known, null must be returned. 
     * 
     * @param string realm
     * @param string username 
     * @return string|null 
     */
    this.getDigestHash = function(realm, username, cbdighash) {};

    /**
     * Returns an HTTP 401 header, forcing login
     *
     * This should be called when username and password are incorrect, or not supplied at all
     *
     * @return void
     */
    this.requireAuth = function(res, realm, err, cbreqauth) {
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
    };

    /**
     * Authenticates the user based on the current request.
     *
     * If authentication is succesful, true must be returned.
     * If authentication fails, an exception must be thrown.
     *
     * @throws Sabre_DAV_Exception_NotAuthenticated
     * @return bool 
     */
    this.authenticate = function(handler, realm, cbauth) {
        var req = handler.httpRequest,
            res = handler.httpResponse;
        this.init(realm, req);

        var username = this.digestParts["username"];
        // No username was given
        if (!username)
            return this.requireAuth(res, realm, "No digest authentication headers were found", cbauth);

        var _self = this;
        this.getDigestHash(realm, username, function(err, hash) {
            // If this was false, the user account didn't exist
            if (err || !hash)
                return _self.requireAuth(res, realm, err || "The supplied username was not on file", cbauth);

            if (typeof hash != "string") {
                handler.handleError(new Exc.jsDAV_Exception(
                    "The returned value from getDigestHash must be a string or null"));
                return cbauth(null, false);
            }

            // If this was false, the password or part of the hash was incorrect.
            _self.validateA1(handler, hash, function(isValid) {
                if (!isValid)
                    return _self.requireAuth(res, realm, "Incorrect username", cbauth);

                _self.currentUser = username;
                cbauth(null, true);
            });
        });
    };

    /**
     * Returns the currently logged in username. 
     * 
     * @return string|null 
     */
    this.getCurrentUser = function(callback) {
        callback(null, this.currentUser);
    };
}).call(jsDAV_Auth_Backend_AbstractDigest.prototype = new jsDAV_Auth_iBackend());

module.exports = jsDAV_Auth_Backend_AbstractDigest;
