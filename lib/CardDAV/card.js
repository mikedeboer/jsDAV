/*
 * @package jsDAV
 * @subpackage CardDAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_File = require("./../DAV/file");
var jsCardDAV_iCard = require("./interfaces/iCard");
var jsDAVACL_iAcl = require("./../DAVACL/interfaces/iAcl")

var Exc = require("./../shared/exceptions");
var Util = require("./../shared/util");

/**
 * The Card object represents a single Card from an addressbook
 */
var jsCardDAV_Card = module.exports = jsDAV_File.extend(jsCardDAV_iCard, jsDAVACL_iAcl, {
    /**
     * CardDAV backend
     *
     * @var jsCardDAV_iBackend
     */
    carddavBackend: null,

    /**
     * array with information about this Card
     *
     * @var object
     */
    cardData: {},

    /**
     * array with information about the containing addressbook
     *
     * @var object
     */
    addressBookInfo: {},

    /**
     * Constructor
     *
     * @param Backend\BackendInterface carddavBackend
     * @param {Array} addressBookInfo
     * @param {Array} cardData
     */
    initialize: function(carddavBackend, addressBookInfo, cardData) {
        this.carddavBackend = carddavBackend;
        this.addressBookInfo = addressBookInfo;
        this.cardData = cardData;
    },

    /**
     * Returns the uri for this object
     *
     * @return string
     */
    getName: function() {
        return this.cardData.uri;
    },

    /**
     * Returns the VCard-formatted object
     *
     * @return string
     */
    get: function(callback) {
        if (this.cardData.carddata)
            return callback(null, this.cardData.carddata)
            
        // Pre-populating 'carddata' is optional. If we don't yet have it
        // already, we fetch it from the backend.
        var self = this;
        this.carddavBackend.getCard(this.addressBookInfo.id, this.cardData.uri, function(err, cardData) {
            if (err)
                return callback(err);
                
            self.cardData.carddata = cardData;
            callback(null, self.cardData.carddata);
        });
    },

    /**
     * Updates the VCard-formatted object
     *
     * @param {String} cardData
     * @return string|null
     */
    put: function(cardData, enc, callback) {
        var self = this;
        if (Buffer.isBuffer(cardData))
            cardData = cardData.toString("utf8");
        this.carddavBackend.updateCard(this.addressBookInfo.id, this.cardData.uri, cardData, function(err, etag) {
            if (err)
                return callback(err);
                
            self.cardData.carddata = cardData;
            self.cardData.etag = etag;
            callback(null, etag);
         });
    },

    /**
     * Deletes the card
     *
     * @return void
     */
    "delete": function(callback) {
        this.carddavBackend.deleteCard(this.addressBookInfo.id, this.cardData.uri, callback);
    },

    /**
     * Returns the mime content-type
     *
     * @return string
     */
    getContentType: function(callback) {
        callback(null, "text/x-vcard; charset=utf-8");
    },

    /**
     * Returns an ETag for this object
     *
     * @return string
     */
    getETag: function(callback) {
        if (this.cardData.etag)
            return callback(null, this.cardData.etag);
            
        this.get(function(err, data) {
            if (err)
                return callback(err);
            callback(null, '"' + Util.createHash(data) + '"');
        });
    },

    /**
     * Returns the last modification date as a unix timestamp
     *
     * @return int
     */
    getLastModified: function(callback) {
        callback(null, this.cardData.lastmodified ? this.cardData.lastmodified : null);
    },

    /**
     * Returns the size of this object in bytes
     *
     * @return int
     */
    getSize: function(callback) {
        if (this.cardData.size)
            return callback(null, this.cardData.size);
            
        this.get(function(err, cardData) {
            if (err)
                return callback(err);
            callback(null, cardData.length);
        });
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
