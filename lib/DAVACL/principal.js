/*
 * @package jsDAV
 * @subpackage DAVACL
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_Node = require("./../DAV/node");
var jsDAVACL_iPrincipal = require("./interfaces/iPrincipal");
var jsDAVACL_iAcl = require("./interfaces/iAcl");
var jsDAV_iProperties = require("./../DAV/interfaces/iProperties");

var Exc = require("./../shared/exceptions");
var Util = require("./../shared/util");

/**
 * Principal class
 *
 * This class is a representation of a simple principal
 *
 * Many WebDAV specs require a user to show up in the directory
 * structure.
 *
 * This principal also has basic ACL settings, only allowing the principal
 * access it's own principal.
 */
var jsDAVACL_Principal = module.exports = jsDAV_Node.extend(jsDAVACL_iPrincipal, jsDAV_iProperties, jsDAVACL_iAcl, {
    /**
     * Struct with principal information.
     *
     * @var array
     */
    principalProperties: null,

    /**
     * Principal backend
     *
     * @var PrincipalBackend\BackendInterface
     */
    principalBackend: null,

    /**
     * Creates the principal object
     *
     * @param jsDAVACL_iPrincipalBackend principalBackend
     * @param {Array} principalProperties
     */
    initialize: function(principalBackend, principalProperties) {
        if (!principalProperties.uri)
            throw new Exc.jsDAV_Exception("The principal properties must at least contain the \"uri\" key");

        this.principalBackend = principalBackend;
        this.principalProperties = principalProperties;
    },

    /**
     * Returns the full principal url
     *
     * @return string
     */
    getPrincipalUrl: function() {
        return this.principalProperties.uri;
    },

    /**
     * Returns a list of alternative urls for a principal
     *
     * This can for example be an email address, or ldap url.
     *
     * @return array
     */
    getAlternateUriSet: function() {
        var uris = [];
        if (this.principalProperties["{DAV:}alternate-URI-set"])
            uris = this.principalProperties["{DAV:}alternate-URI-set"];

        if (this.principalProperties["{http://ajax.org/2005/aml}email-address"])
            uris.push("mailto:" + this.principalProperties["{http://ajax.org/2005/aml}email-address"]);

        return Util.makeUnique(uris);
    },

    /**
     * Returns the list of group members
     *
     * If this principal is a group, this function should return
     * all member principal uri's for the group.
     *
     * @param Function callback
     * @return array
     */
    getGroupMemberSet: function(callback) {
        this.principalBackend.getGroupMemberSet(this.principalProperties.uri, callback);
    },

    /**
     * Returns the list of groups this principal is member of
     *
     * If this principal is a member of a (list of) groups, this function
     * should return a list of principal uri's for it's members.
     *
     * @param Function callback
     * @return array
     */
    getGroupMembership: function(callback) {
        this.principalBackend.getGroupMemberShip(this.principalProperties.uri, callback);
    },

    /**
     * Sets a list of group members
     *
     * If this principal is a group, this method sets all the group members.
     * The list of members is always overwritten, never appended to.
     *
     * This method should throw an exception if the members could not be set.
     *
     * @param {Array} groupMembers
     * @return void
     */
    setGroupMemberSet: function(groupMembers, callback) {
        this.principalBackend.setGroupMemberSet(this.principalProperties.uri, groupMembers, callback);
    },

    /**
     * Returns this principals name.
     *
     * @return string
     */
    getName: function() {
        var uri = this.principalProperties.uri;
        return Util.splitPath(uri)[1];
    },

    /**
     * Returns the name of the user
     *
     * @return string
     */
    getDisplayName: function() {
        if (this.principalProperties["{DAV:}displayname"])
            return this.principalProperties["{DAV:}displayname"];
        else
            return this.getName();
    },

    /**
     * Returns a list of properties
     *
     * @param {Array} requestedProperties
     * @return array
     */
    getProperties: function(requestedProperties, callback) {
        var newProperties = {};
        for (var propName, i = 0, l = requestedProperties.length; i < l; ++i) {
            propName = requestedProperties[i];
            if (this.principalProperties[propName])
                newProperties[propName] = this.principalProperties[propName];
        }

        callback(null, newProperties);
    },

    /**
     * Updates this principals properties.
     *
     * @param {Array} mutations
     * @param Function callback
     * @see jsDAV_iProperties#updateProperties
     * @return bool|array
     */
    updateProperties: function(mutations, callback) {
        this.principalBackend.updatePrincipal(this.principalProperties.uri, mutations, callback);
    },

    /**
     * Returns the owner principal
     *
     * This must be a url to a principal, or null if there's no owner
     *
     * @return string|null
     */
    getOwner: function() {
        return this.principalProperties.uri;
    },

    /**
     * Returns a group principal
     *
     * This must be a url to a principal, or null if there's no owner
     *
     * @return string|null
     */
    getGroup: function() {
        return null;
    },

    /**
     * Returns a list of ACE's for this node.
     *
     * Each ACE has the following properties:
     *   * 'privilege', a string such as {DAV:}read or {DAV:}write. These are
     *     currently the only supported privileges
     *   * 'principal', a url to the principal who owns the node
     *   * 'protected' (optional), indicating that this ACE is not allowed to
     *      be updated.
     *
     * @return array
     */
    getACL: function() {
        return [
            {
                "privilege": "{DAV:}read",
                "principal": this.getPrincipalUrl(),
                "protected": true,
            },
        ];
    },

    /**
     * Updates the ACL
     *
     * This method will receive a list of new ACE's.
     *
     * @param {Array} acl
     * @return void
     */
    setACL: function(acl, callback) {
        callback(new Exc.MethodNotAllowed("Updating ACLs is not allowed here"));
    },

    /**
     * Returns the list of supported privileges for this node.
     *
     * The returned data structure is a list of nested privileges.
     * See jsDAVACL_Plugin.getDefaultSupportedPrivilegeSet for a simple
     * standard structure.
     *
     * If null is returned from this method, the default privilege set is used,
     * which is fine for most common usecases.
     *
     * @return array|null
     */
    getSupportedPrivilegeSet: function() {
        return null;
    }
});
