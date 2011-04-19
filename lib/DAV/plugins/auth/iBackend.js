/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV = require("./../../../jsdav");

/**
 * This is the base class for any authentication object.
 */
function jsDAV_Auth_iBackend() {
    this.REGBASE = this.REGBASE | jsDAV.__AUTH_IBACKEND__;

    /**
     * Authenticates the user based on the current request.
     *
     * If authentication is succesful, true must be returned.
     * If authentication fails, an exception must be thrown.
     *
     * @return {bool}
     */
    this.authenticate = function(server, realm, cbauth) {};

    /**
     * Returns information about the currently logged in username.
     *
     * If nobody is currently logged in, this method should return null.
     * 
     * @return {string|null}
     */
    this.getCurrentUser = function(cbgetuser) {};
}

exports.jsDAV_Auth_iBackend = jsDAV_Auth_iBackend;
