/*
 * @package jsDAV
 * @subpackage DAVACL
 * @copyright Copyright(c) 2011 Tri Tech Computers Ltd. <info AT tri-tech DOT com>
 * @author James Emerton <james AT tri-tech DOT com>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var Exc = require("./../DAV/exceptions");
var Util = require("./../DAV/util");

var jsDAV_Node = require("./../DAV/node").jsDAV_Node;
var jsDAV_iProperties = require("./../DAV/iProperties").jsDAV_iProperties;
var jsDAV_iPrincipal = require("./iPrincipal").jsDAV_iPrincipal;

var jsDAV_Property_ResourceType = require("./../DAV/property/resourceType").jsDAV_Property_ResourceType;
var jsDAV_Property_Href = require("./../DAV/property/href").jsDAV_Property_Href;


function jsDAV_Principal(backend, properties) {
    if(properties['uri'] === undefined)
        throw new Exc.jsDAV_Exception("Principal properties must include 'uri'");

    this.backend = backend;
    this.properties = properties;
}

(function() {
    this.implement(jsDAV_iPrincipal, jsDAV_iProperties);

    /**
     * Returns the full principal url 
     * 
     * @return string 
     */
    this.getPrincipalUrl = function() {
        return this.properties['uri'];
    } 

    /**
     * Returns a list of altenative urls for a principal
     * 
     * This can for example be an email address, or ldap url.
     * 
     * @return array 
     */
    this.getAlternateUriSet = function() {
        var uris = this.properties['{DAV:}alternate-URI-set'] || [];

        if(this.properties['{http://ajax.org/2005/aml}email-address'])
            uris.push('mailto:'+this.properties['{http://ajax.org/2005/aml}email-address']);

        return Util.makeUnique(uris);
    }

    /**
     * Returns the list of group members
     * 
     * If this principal is a group, this function should return
     * all member principal uri's for the group. 
     * 
     * @return array
     */
    this.getGroupMemberSet = function(callback) {
        this.backend.getGroupMemberSet(this.properties['uri'], callback);

    }

    /**
     * Returns the list of groups this principal is member of
     * 
     * If this principal is a member of a (list of) groups, this function
     * should return a list of principal uri's for it's members. 
     * 
     * @return array 
     */
    this.getGroupMembership = function(callback) {
        this.backend.getGroupMembership(this.properties['uri'], callback);
    }


    /**
     * Sets a list of group members
     *
     * If this principal is a group, this method sets all the group members.
     * The list of members is always overwritten, never appended to.
     * 
     * This method should throw an exception if the members could not be set. 
     * 
     * @param array $principals 
     * @return void 
     */
    this.setGroupMemberSet = function(members, callback) {
        this.backend.setGroupMemberSet(this.properties['uri'], members, callback);
    }


    /**
     * Returns this principals name.
     * 
     * @return string 
     */
    this.getName = function() {
        return Util.splitPath(this.properties['uri'])[1];
    }

    /**
     * Returns the name of the user 
     * 
     * @return void
     */
    this.getDisplayName = function() {
        return this.properties['{DAV:}displayname'] || this.getName();
    }

    /**
     * Returns a list of properties 
     * 
     * @param array $requestedProperties 
     * @return void
     */
    this.getProperties = function(reqProps) {
        var newProperties = [];
        for(var propname in reqProps)
            newProperties[propname] = this.properties[propname];

        return newProperties;
    }

    /**
     * Updates this principals properties.
     *
     * Currently this is not supported
     * 
     * @param array $properties
     * @see Sabre_DAV_IProperties::updateProperties
     * @return bool|array 
     */
    this.updateProperties = function(properties, callback) {
        callback(null, false);
    }

    /**
     * Returns the owner principal
     *
     * This must be a url to a principal, or null if there's no owner 
     * 
     * @return string|null
     */
    this.getOwner = function() {
        return this.properties['uri'];
    }

    /**
     * Returns a group principal
     *
     * This must be a url to a principal, or null if there's no owner
     * 
     * @return string|null 
     */
    this.getGroup = function() {
        return null;
    }

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
    this.getACL = function() {
        return [{
                "privilege": '{DAV:}read',
                "principal": '{DAV:}authenticated',
                "protected": true
        }];

    }

    /**
     * Updates the ACL
     *
     * This method will receive a list of new ACE's. 
     * 
     * @param array $acl 
     * @return void
     */
    this.setACL = function(acl) {
        throw new Exc.jsDAV_Exception_MethodNotAllowed('Updating ACLs is not allowed here');
    }

    /**
     * Returns the list of supported privileges for this node.
     *
     * The returned data structure is a list of nested privileges.
     * See Sabre_DAVACL_Plugin::getDefaultSupportedPrivilegeSet for a simple 
     * standard structure.
     *
     * If null is returned from this method, the default privilege set is used, 
     * which is fine for most common usecases.
     *
     * @return array|null
     */
    this.getSupportedPrivilegeSet = function() {
        return null;
    }


    this.getProperties = function(properties) {
        return {
            '{DAV:}principal-URL': new jsDAV_Property_Href(this.properties['uri'])
        }
    }
    
}).call(jsDAV_Principal.prototype = new jsDAV_Node());

exports.jsDAV_Principal = jsDAV_Principal;
