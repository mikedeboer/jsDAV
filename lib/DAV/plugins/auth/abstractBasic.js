/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV_Auth_iBackend = require("./iBackend").jsDAV_Auth_iBackend,

    Exc   = require("./../../exceptions");

/**
 * HTTP Basic authentication backend class
 *
 * This class can be used by authentication objects wishing to use HTTP Basic
 * Most of the digest logic is handled, implementors just need to worry about
 * the validateUserPass method.
 */
function jsDAV_Auth_Backend_AbstractBasic() { }

(function() {
    /**
     * This variable holds the currently logged in username.
     *
     * @var string|null
     */
    this.currentUser = null;

    /**
     * Validates a username and password
     *
     * This method should return true or false depending on if login
     * succeeded.
     *
     * @return bool
     */
    this.validateUserPass = function(username, password, cbvalidpass) {};

    /**
     * Returns information about the currently logged in username.
     *
     * If nobody is currently logged in, this method should return null.
     *
     * @return string|null
     */
    this.getCurrentUser = function(callback) {
        return callback(null, this.currentUser);
    };

    /**
     * Returns an HTTP 401 header, forcing login
     *
     * This should be called when username and password are incorrect, or not supplied at all
     *
     * @return void
     */
    this.requireAuth = function(res, realm, err, callback) {
        res.writeHead(401, {"WWW-Authenticate": "Basic realm=\"" + realm + "\""});
        res.end();
        callback(err);
    };

    /**
     * Authenticates the user based on the current request.
     *
     * If authentication is succesful, true must be returned.
     * If authentication fails, an exception must be thrown.
     *
     * @throws jsDAV_Exception_NotAuthenticated
     * @return bool
     */
    this.authenticate = function(handler, realm, cbauth) {
        var req = handler.httpRequest,
            res = handler.httpResponse;

        var auth = req.headers["authorization"];
        if (!auth || auth.toLowerCase().indexOf("basic") !== 0)
            return this.requireAuth(res, realm, "No basic authentication headers were found", cbauth);

        userpass = (new Buffer(auth.substr(6), "base64")).toString("utf8").split(":");
        if (!userpass.length)
            return this.requireAuth(res, realm, "No basic authentication headers were found", cbauth);

        // Authenticates the user
        var _self = this;
        this.validateUserPass(userpass[0], userpass[1], function(valid) {
            if (!valid) 
                return _self.requireAuth(res, realm, "Username or password does not match", cbauth);

            _self.currentUser = userpass[0];
            callback(null, true);
        });
    };
}).call(jsDAV_Auth_Backend_AbstractBasic.prototype = new jsDAV_Auth_iBackend());

module.exports = jsDAV_Auth_Backend_AbstractBasic;
