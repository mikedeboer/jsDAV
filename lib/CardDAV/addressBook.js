/*
 * @package jsDAV
 * @subpackage CardDAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_Collection = require("./../DAV/collection");
var jsCardDAV_iAddressBook = require("./interfaces/iAddressBook");
var jsDAV_iProperties = require("./../DAV/interfaces/iProperties");
var jsDAVACL_iAcl = require("./../DAVACL/interfaces/iAcl");
var jsCardDAV_Card = require("./card");

var Exc = require("./../shared/exceptions");

/**
 * The AddressBook class represents a CardDAV addressbook, owned by a specific user
 *
 * The AddressBook can contain multiple vcards
 */
var jsCardDAV_AddressBook = module.exports = jsDAV_Collection.extend(jsCardDAV_iAddressBook, jsDAV_iProperties, jsDAVACL_iAcl, {
    /**
     * This is an array with addressbook information
     *
     * @var array
     */
    addressBookInfo: {},

    /**
     * CardDAV backend
     *
     * @var jsCardDAV_iBackend
     */
    carddavBackend: null,

    /**
     * Constructor
     *
     * @param jsCardDAV_iBackend carddavBackend
     * @param {Object} addressBookInfo
     */
    initialize: function(carddavBackend, addressBookInfo) {
        this.carddavBackend = carddavBackend;
        this.addressBookInfo = addressBookInfo;
    },

    /**
     * Returns the name of the addressbook
     *
     * @return string
     */
    getName: function() {
        return this.addressBookInfo.uri;
    },

    /**
     * Returns a card
     *
     * @param {String} name
     * @return \ICard
     */
    getChild: function(name, callback) {
        var self = this;
        this.carddavBackend.getCard(this.addressBookInfo.id, name, function(err, obj) {
            if (!obj)
                return callback(new Exc.NotFound("Card not found"));
            callback(null, jsCardDAV_Card.new(self.carddavBackend, self.addressBookInfo, obj));
        });
    },

    /**
     * Returns the full list of cards
     *
     * @return array
     */
    getChildren: function(callback) {
        var self = this;
        this.carddavBackend.getCards(this.addressBookInfo.id, function(err, objs) {
            if (err)
                return callback(err);
                
            var children = objs.map(function(obj) {
                return jsCardDAV_Card.new(self.carddavBackend, self.addressBookInfo, obj);
            });
            callback(null, children);
        });
    },

    /**
     * Creates a new directory
     *
     * We actually block this, as subdirectories are not allowed in addressbooks.
     *
     * @param {String} name
     * @return void
     */
    createDirectory: function(name, callback) {
        callback(new Exc.MethodNotAllowed("Creating collections in addressbooks is not allowed"));
    },

    /**
     * Creates a new file
     *
     * The contents of the new file must be a valid VCARD.
     *
     * This method may return an ETag.
     *
     * @param {String} name
     * @param resource vcardData
     * @return string|null
     */
    createFile: function(name, vcardData, enc, callback) {
        if (Buffer.isBuffer(vcardData))
            vcardData = vcardData.toString("utf8");
        this.carddavBackend.createCard(this.addressBookInfo.id, name, vcardData, callback);
    },

    /**
     * Deletes the entire addressbook.
     *
     * @return void
     */
    "delete": function(callback) {
        this.carddavBackend.deleteAddressBook(this.addressBookInfo.id, callback);
    },

    /**
     * Renames the addressbook
     *
     * @param {String} newName
     * @return void
     */
    setName: function(newName, callback) {
        callback(new Exc.MethodNotAllowed("Renaming addressbooks is not yet supported"));
    },

    /**
     * Returns the last modification date as a unix timestamp.
     *
     * @return void
     */
    getLastModified: function(callback) {
        callback(null, null);
    },

    /**
     * Updates properties on this node,
     *
     * The properties array uses the propertyName in clark-notation as key,
     * and the array value for the property value. In the case a property
     * should be deleted, the property value will be null.
     *
     * This method must be atomic. If one property cannot be changed, the
     * entire operation must fail.
     *
     * If the operation was successful, true can be returned.
     * If the operation failed, false can be returned.
     *
     * Deletion of a non-existent property is always successful.
     *
     * Lastly, it is optional to return detailed information about any
     * failures. In this case an array should be returned with the following
     * structure:
     *
     * {
     *   "403" : {
     *      "{DAV:}displayname" : null,
     *   },
     *   "424" : {
     *      "{DAV:}owner" : null,
     *   }
     * }
     *
     * In this example it was forbidden to update {DAV:}displayname.
     * (403 Forbidden), which in turn also caused {DAV:}owner to fail
     * (424 Failed Dependency) because the request needs to be atomic.
     *
     * @param {Object} mutations
     * @return bool|array
     */
    updateProperties: function(mutations, callback) {
        this.carddavBackend.updateAddressBook(this.addressBookInfo.id, mutations, callback);
    },

    /**
     * Returns a list of properties for this nodes.
     *
     * The properties list is a list of propertynames the client requested,
     * encoded in clark-notation {xmlnamespace}tagname
     *
     * If the array is empty, it means 'all properties' were requested.
     *
     * @param {Array} properties
     * @return array
     */
    getProperties: function(properties, callback) {
        var response = {};
        var self = this;
        
        properties.forEach(function(propertyName) {
            if (self.addressBookInfo[propertyName])
                response[propertyName] = self.addressBookInfo[propertyName];
        });

        callback(null, response);
    },

    /**
     * Returns the owner principal
     *
     * This must be a url to a principal, or null if there's no owner
     *
     * @return string|null
     */
    getOwner: function() {
        return this.addressBookInfo.principaluri;
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
                "privilege" : "{DAV:}read",
                "principal" : this.addressBookInfo.principaluri,
                "protected" : true
            },
            {
                "privilege" : "{DAV:}write",
                "principal" : this.addressBookInfo.principaluri,
                "protected" : true
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
