/*
 * @package jsDAV
 * @subpackage CardDAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var Base = require("./../../shared/base");
var Exc = require("./../../shared/exceptions");

/**
 * CardDAV Backend Interface
 *
 * Any CardDAV backend must implement this interface.
 *
 * Note that there are references to 'addressBookId' scattered throughout the
 * class. The value of the addressBookId is completely up to you, it can be any
 * arbitrary value you can use as an unique identifier.
 */
var jsCardDAV_iBackend = module.exports = Base.extend({
    /**
     * Returns the list of addressbooks for a specific user.
     *
     * Every addressbook should have the following properties:
     *   id - an arbitrary unique id
     *   uri - the 'basename' part of the url
     *   principaluri - Same as the passed parameter
     *
     * Any additional clark-notation property may be passed besides this. Some
     * common ones are :
     *   {DAV:}displayname
     *   {urn:ietf:params:xml:ns:carddav}addressbook-description
     *   {http://calendarserver.org/ns/}getctag
     *
     * @param {String} principalUri
     * @return array
     */
    getAddressBooksForUser: function(principalUri, callback) { callback(Exc.notImplementedYet()); },

    /**
     * Updates an addressbook's properties
     *
     * See Sabre\DAV\IProperties for a description of the mutations array, as
     * well as the return value.
     *
     * @param {mixed} addressBookId
     * @param {Array} mutations
     * @see Sabre\DAV\IProperties::updateProperties
     * @return bool|array
     */
    updateAddressBook: function(addressBookId, mutations, callback) { callback(Exc.notImplementedYet()); },

    /**
     * Creates a new address book
     *
     * @param {String} principalUri
     * @param {String} url Just the 'basename' of the url.
     * @param {Array} properties
     * @return void
     */
    createAddressBook: function(principalUri, url, properties, callback) { callback(Exc.notImplementedYet()); },

    /**
     * Deletes an entire addressbook and all its contents
     *
     * @param {mixed} addressBookId
     * @return void
     */
    deleteAddressBook: function(addressBookId, callback) { callback(Exc.notImplementedYet()); },

    /**
     * Returns all cards for a specific addressbook id.
     *
     * This method should return the following properties for each card:
     *   * carddata - raw vcard data
     *   * uri - Some unique url
     *   * lastmodified - A unix timestamp
     *
     * It's recommended to also return the following properties:
     *   * etag - A unique etag. This must change every time the card changes.
     *   * size - The size of the card in bytes.
     *
     * If these last two properties are provided, less time will be spent
     * calculating them. If they are specified, you can also ommit carddata.
     * This may speed up certain requests, especially with large cards.
     *
     * @param {mixed} addressbookId
     * @return array
     */
    getCards: function(addressbookId, callback) { callback(Exc.notImplementedYet()); },

    /**
     * Returns a specfic card.
     *
     * The same set of properties must be returned as with getCards. The only
     * exception is that 'carddata' is absolutely required.
     *
     * @param {mixed} addressBookId
     * @param {String} cardUri
     * @return array
     */
    getCard: function(addressBookId, cardUri, callback) { callback(Exc.notImplementedYet()); },

    /**
     * Creates a new card.
     *
     * The addressbook id will be passed as the first argument. This is the
     * same id as it is returned from the getAddressbooksForUser method.
     *
     * The cardUri is a base uri, and doesn't include the full path. The
     * cardData argument is the vcard body, and is passed as a string.
     *
     * It is possible to return an ETag from this method. This ETag is for the
     * newly created resource, and must be enclosed with double quotes (that
     * is, the string itself must contain the double quotes).
     *
     * You should only return the ETag if you store the carddata as-is. If a
     * subsequent GET request on the same card does not have the same body,
     * byte-by-byte and you did return an ETag here, clients tend to get
     * confused.
     *
     * If you don't return an ETag, you can just return null.
     *
     * @param {mixed} addressBookId
     * @param {String} cardUri
     * @param {String} cardData
     * @return string|null
     */
    createCard: function(addressBookId, cardUri, cardData, callback) { callback(Exc.notImplementedYet()); },

    /**
     * Updates a card.
     *
     * The addressbook id will be passed as the first argument. This is the
     * same id as it is returned from the getAddressbooksForUser method.
     *
     * The cardUri is a base uri, and doesn't include the full path. The
     * cardData argument is the vcard body, and is passed as a string.
     *
     * It is possible to return an ETag from this method. This ETag should
     * match that of the updated resource, and must be enclosed with double
     * quotes (that is: the string itself must contain the actual quotes).
     *
     * You should only return the ETag if you store the carddata as-is. If a
     * subsequent GET request on the same card does not have the same body,
     * byte-by-byte and you did return an ETag here, clients tend to get
     * confused.
     *
     * If you don't return an ETag, you can just return null.
     *
     * @param {mixed} addressBookId
     * @param {String} cardUri
     * @param {String} cardData
     * @return string|null
     */
    updateCard: function(addressBookId, cardUri, cardData, callback) { callback(Exc.notImplementedYet()); },

    /**
     * Deletes a card
     *
     * @param {mixed} addressBookId
     * @param {String} cardUri
     * @return bool
     */
    deleteCard: function(addressBookId, cardUri, callback) { callback(Exc.notImplementedYet()); }
});
