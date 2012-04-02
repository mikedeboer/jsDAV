/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV = require("./../../../jsdav");

/**
 * This is the base class for any authentication object.
 */
function jsDAV_Auth_iBackend() {
    this.REGBASE = this.REGBASE | jsDAV.__AUTH_IBACKEND__;

    /**
     * Authenticates the user based on the current request.
     *
     * If authentication is succesful, the current user must be passed
     * to the callback.
     * If authentication fails, null should be passed to the callback.
     *
     * @return {bool}
     */
    this.authenticate = function(server, realm, cbauth) {};
}

exports.jsDAV_Auth_iBackend = jsDAV_Auth_iBackend;
