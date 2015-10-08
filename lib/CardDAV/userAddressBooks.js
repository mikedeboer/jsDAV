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
var jsDAVACL_iAcl = require("./../DAVACL/interfaces/iAcl")
var jsCardDAV_AddressBook = require("./addressBook");

var Exc = require("./../shared/exceptions");
var Util = require("./../shared/util");

/**
 * UserAddressBooks class
 *
 * The UserAddressBooks collection contains a list of addressbooks associated with a user
 */
var jsCardDAV_UserAddressBooks = module.exports = jsDAV_Collection.extend(jsDAV_iExtendedCollection, jsDAVACL_iAcl, {
    /**
     * Principal uri
     *
     * @var array
     */
    principalUri: null,

    /**
     * carddavBackend
     *
     * @var jsCardDAV_iBackend
     */
    carddavBackend: null,

    /**
     * Constructor
     *
     * @param Backend\BackendInterface carddavBackend
     * @param {String} principalUri
     */
    initialize: function(carddavBackend, principalUri) {
        this.carddavBackend = carddavBackend;
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
    createFile: function(filename, data, enc, callback) {
        callback(new Exc.MethodNotAllowed("Creating new files in this collection is not supported"));
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
        callback(new Exc.MethodNotAllowed("Creating new collections in this collection is not supported"));
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
                if (children[i].getName() == name)
                    return callback(null, children[i]);
            }
            callback(new Exc.NotFound("Addressbook with name '" + name + "' could not be found"));
        });
    },

    /**
     * Returns a list of addressbooks
     *
     * @return array
     */
    getChildren: function(callback) {
        var self = this;
        this.carddavBackend.getAddressBooksForUser(this.principalUri, function(err, addressbooks) {
            if (err)
                return callback(err);
                
            var objs = addressbooks.map(function(addressbook) {
                return jsCardDAV_AddressBook.new(self.carddavBackend, addressbook);
            });
            callback(null, objs);
        });
    },

    /**
     * Creates a new addressbook
     *
     * @param {String} name
     * @param {Array} resourceType
     * @param {Array} properties
     * @return void
     */
    createExtendedCollection: function(name, resourceType, properties, callback) {
        if (resourceType.indexOf("{" + require("./plugin").NS_CARDDAV + "}addressbook") === -1 || resourceType.length !== 2)
            return callback(Exc.InvalidResourceType("Unknown resourceType for this collection"));

        this.carddavBackend.createAddressBook(this.principalUri, name, properties, callback);
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
