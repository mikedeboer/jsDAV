/*
 * @package jsDAV
 * @subpackage CardDAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_Collection = require("./../DAV/collection");
var jsDAV_iExtendedCollection = require("./../DAV/interfaces/iExtendedCollection");
var jsDAVACL_iAcl = require("./../DAVACL/interfaces/iAcl");

var jsCalDAV_Calendar = require("./calendar.js");

var Exc = require("./../shared/exceptions");
var Util = require("./../shared/util");

/**
 * UserAddressBooks class
 *
 * The UserAddressBooks collection contains a list of addressbooks associated with a user
 */
module.exports = jsDAV_Collection.extend(jsDAV_iExtendedCollection, jsDAVACL_iAcl, {
    /**
     * Principal uri
     *
     * @var array
     */
    principalUri: null,

    /**
     * caldavBackend
     *
     * @var jsCardDAV_iBackend
     */
    caldavBackend: null,

    /**
     * Constructor
     *
     * @param Backend\BackendInterface caldavBackend
     * @param {String} principalUri
     */
    initialize: function(caldavBackend, principalUri) {
        this.caldavBackend = caldavBackend;
        this.principalUri = principalUri;
    },

    /**
     * Returns the name of this object
     *
     * @return string
     */
    getName: function() {
        return Util.splitPath(this.principalUri)[1];
    },

    /**
     * Updates the name of this object
     *
     * @param {String} name
     * @return void
     */
    setName: function(name, callback) {
        callback(new Exc.MethodNotAllowed());
    },

    /**
     * Deletes this object
     *
     * @return void
     */
    delete: function(callback) {
        callback(new Exc.MethodNotAllowed());
    },

    /**
     * Returns the last modification date
     *
     * @return int
     */
    getLastModified: function(callback) {
        callback(null, null);
    },

    /**
     * Creates a new file under this object.
     *
     * This is currently not allowed
     *
     * @param {String} filename
     * @param resource data
     * @return void
     */
    createFile: function(filename, data, callback) {
        callback(new Exc.MethodNotAllowed("Creating new files in this collection " +
                                          "is not supported"));
    },

    /**
     * Creates a new directory under this object.
     *
     * This is currently not allowed.
     *
     * @param {String} filename
     * @return void
     */
    createDirectory: function(filename, callback) {
        callback(new Exc.MethodNotAllowed("Creating new collections in this collection " +
                                          "is not supported"));
    },

    /**
     * Returns a single calendar, by name
     *
     * @param {String} name
     * @todo needs optimizing
     * @return jsCardDAV_AddressBook
     */
    getChild: function(name, callback) {
        this.getChildren(function(err, children) {
            if (err)
                return callback(err);

            for (var i = 0, l = children.length; i < l; ++i) {
                if (children[i].getName() === name)
                    return callback(null, children[i]);
            }
            callback(new Exc.NotFound("Calendar with name '" + name + "' could not be found"));
        });
    },

    /**
     * Returns a list of addressbooks
     *
     * @return array
     */
    getChildren: function(callback) {
        var self = this;
        this.caldavBackend.getCalendarsForUser(this.principalUri, function(err, calendars) {
            if (err)
                return callback(err);

            var objs = calendars.map(function(calendar) {
                return jsCalDAV_Calendar.new(self.caldavBackend, calendar);
            });
            callback(null, objs);
        });
    },

    /**
     * Creates a new calendar
     *
     * @param {String} name
     * @param {Array} resourceType
     * @param {Array} properties
     * @return void
     */
    createExtendedCollection: function(name, resourceType, properties, callback) {
        callback(new Exc.MethodNotAllowed("Creating new collections in this collection " +
                                          "is not supported"));
    },

    /**
     * Returns the owner principal
     *
     * This must be a url to a principal, or null if there's no owner
     *
     * @return string|null
     */
    getOwner: function() {
        return this.principalUri;
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
                privilege: "{DAV:}read",
                principal: this.principalUri,
                "protected" : true
            },
            {
                privilege: "{DAV:}write",
                principal: this.principalUri,
                "protected": true
            }
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
        callback(new Exc.MethodNotAllowed("Changing ACL is not yet supported"));
    },

    /**
     * Returns the list of supported privileges for this node.
     *
     * The returned data structure is a list of nested privileges.
     * See Sabre\DAVACL\Plugin::getDefaultSupportedPrivilegeSet for a simple
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
