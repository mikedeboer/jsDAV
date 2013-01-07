/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var Base = require("./../../shared/base");
var jsDAV_iNode = require("./../../DAV/interfaces/iNode");

/**
 * IPrincipal interface
 *
 * Implement this interface to define your own principals
 */
var jsDAVACL_iPrincipal = module.exports = Base.extend(jsDAV_iNode, {
    /**
     * Returns a list of alternative urls for a principal
     *
     * This can for example be an email address, or ldap url.
     *
     * @return array
     */
    getAlternateUriSet: function(callback) {},

    /**
     * Returns the full principal url
     *
     * @return string
     */
    getPrincipalUrl: function(callback){},

    /**
     * Returns the list of group members
     *
     * If this principal is a group, this function should return
     * all member principal uri's for the group.
     *
     * @return array
     */
    getGroupMemberSet: function(callback) {},

    /**
     * Returns the list of groups this principal is member of
     *
     * If this principal is a member of a (list of) groups, this function
     * should return a list of principal uri's for it's members.
     *
     * @return array
     */
    getGroupMembership: function(callback) {},

    /**
     * Sets a list of group members
     *
     * If this principal is a group, this method sets all the group members.
     * The list of members is always overwritten, never appended to.
     *
     * This method should throw an exception if the members could not be set.
     *
     * @param array principals
     * @return void
     */
    setGroupMemberSet: function(principals, callback) {},

    /**
     * Returns the displayname
     *
     * This should be a human readable name for the principal.
     * If none is available, return the nodename.
     *
     * @return string
     */
    getDisplayName: function(callback) {}
});
