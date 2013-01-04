/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var Base = require("./../../../shared/base");

/**
 * This is the base class for any authentication object.
 */
var jsDAV_Auth_iBackend = module.exports = Base.extend({
    /**
     * Authenticates the user based on the current request.
     *
     * If authentication is succesful, true must be returned.
     * If authentication fails, an exception must be thrown.
     *
     * @return {bool}
     */
    authenticate: function(server, realm, cbauth) {},

    /**
     * Returns information about the currently logged in username.
     *
     * If nobody is currently logged in, this method should return null.
     *
     * @return {string|null}
     */
    getCurrentUser: function(cbgetuser) {}
});
