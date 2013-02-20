/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAVACL_AbstractPrincipalCollection = require("./abstractPrincipalCollection");
var jsDAVACL_Principal = require("./principal");

/**
 * Principals Collection
 *
 * This collection represents a list of users.
 * The users are instances of jsDAVACL_Principal
 */
var jsDAVACL_PrincipalCollection = module.exports = jsDAVACL_AbstractPrincipalCollection.extend({
    /**
     * This method returns a node for a principal.
     *
     * The passed array contains principal information, and is guaranteed to
     * at least contain a uri item. Other properties may or may not be
     * supplied by the authentication backend.
     *
     * @param {Array} principal
     * @return jsDAV_iNode
     */
    getChildForPrincipal: function(principal) {
        return jsDAVACL_Principal.new(this.principalBackend, principal);
    }
});
