/*
 * @package jsDAV
 * @subpackage CardDAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Daniel Laxar
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsCardDAV_iBackend = require("./../interfaces/iBackend");
var jsCardDAV_Plugin = require("./../plugin");
var jsCardDAV_Property_SupportedAddressData = require("./../property/supportedAddressData");

var Exc = require("./../../shared/exceptions");
var Util = require("./../../shared/util");

/**
 * Postgre CardDAV backend
 *
 * This CardDAV backend uses Mongo to store addressbooks
 */
var jsCardDAV_Backend_Postgres = module.exports = jsCardDAV_iBackend.extend({
    /**
     * Postgre connection
     *
     * @var pg
     */
    pg: null,

    /**
     * The PDO table name used to store addressbooks
     */
    addressBooksTableName: null,

    /**
     * The PDO table name used to store cards
     */
    cardsTableName: null,

    /**
     * Sets up the object
     *
     * @param postgres pg
     * @param {String} addressBooksTableName
     * @param {String} cardsTableName
     */
    initialize: function(pg, addressBooksTableName, cardsTableName) {
        this.pg = pg;
        this.addressBooksTableName = addressBooksTableName || "addressbooks";
        this.cardsTableName = cardsTableName || "cards";
    },

    /**
     * Returns the list of addressbooks for a specific user.
     *
     * @param {String} principalUri
     * @return array
     */
    getAddressBooksForUser: function(principalUri, callback) {
        this.pg.query(
            "SELECT * FROM addressbooks WHERE principaluri=$1",
            [principalUri],
            function(err, result) {
                if (err)
                    return callback(err);

                if (result.rows.length === 0)
                    return callback(err, []);

                var addressBooks = result.rows.map(function(doc) {
                    return {
                        id: doc.id,
                        uri: doc.uri,
                        principaluri: doc.principaluri,
                        "{DAV:}displayname": doc.displayname,
                        "{http://calendarserver.org/ns/}getctag": doc.ctag,
                        "{urn:ietf:params:xml:ns:carddav}addressbook-description": doc.description,
                        "{urn:ietf:params:xml:ns:carddav}supported-address-data":
                            jsCardDAV_Property_SupportedAddressData.new()
                    };
                });
                callback(null, addressBooks);
            }
        );
    },

    /**
     * Updates an addressbook's properties
     *
     * See jsDAV_iProperties for a description of the mutations array, as
     * well as the return value.
     *
     * @param {mixed} addressBookId
     * @param {Array} mutations
     * @see jsDAV_iProperties#updateProperties
     * @return bool|array
     */
    updateAddressBook: function(addressBookId, mutations, callback) {
        var updates = {};
        var newValue, property;

        for (property in mutations) {
            newValue = mutations[property];
            switch (property) {
                case "{DAV:}displayname":
                    updates.displayname = newValue;
                    break;
                case "{" + jsCardDAV_Plugin.NS_CARDDAV + "}addressbook-description":
                    updates.description = newValue;
                    break;
                default:
                    // If any unsupported values were being updated, we must
                    // let the entire request fail.
                    return callback(null, false);
            }
        }

        var prepareCounter = 1;
        var sets = "";
        var values = [];
        for (var prop in updates) {
            sets += (prop + " = $" + prepareCounter++ + ", ");
            values.push(updates[prop]);
        }

        values.push(addressBookId);

        this.pg.query(
            "UPDATE addressbooks SET " + sets + " ctag = ctag+1 WHERE id=$" + prepareCounter,
            values,
            function(err, result) {
                if (err)
                    return callback(err);
                callback(null, true);
            }
        );
    },

    /**
     * Creates a new address book
     *
     * @param {String} principalUri
     * @param {String} url Just the 'basename' of the url.
     * @param {Array} properties
     * @return void
     */
    createAddressBook: function(principalUri, url, properties, callback) {
        var values = {
            "uri": url,
            "principaluri": principalUri,
            "description": null,
            "displayname": null,
            "ctag": 1
        };

        var newValue;
        for (var property in properties) {
            newValue = properties[property];

            switch (property) {
                case "{DAV:}displayname":
                    values.displayname = newValue;
                    break;
                case "{" + jsCardDAV_Plugin.NS_CARDDAV + "}addressbook-description":
                    values.description = newValue;
                    break;
                default:
                    return callback(new Exc.BadRequest("Unknown property: " + property));
            }
        }

        // build query
        var fields;
        var fieldsString = (fields = Object.keys(values)).join(", ");
        var queryValues = [];
        var numbers = [];

        for (var i = 0; i < fields.length; i++) {
            queryValues.push(values[fields[i]]);
            numbers.push("$" + (i+1));
        }

        var query = "INSERT INTO " +  this.addressBooksTableName + " (" +
                    fieldsString + ") VALUES (" + numbers.join(", ") + ") RETURNING ID";

        this.pg.query(query,
            queryValues,
            function(err, result) {
                if (err)
                    return callback(err);

                values.id = result.rows[0].id;
                callback(null, [values]);
            }
        );
    },

    /**
     * Deletes an entire addressbook and all its contents
     *
     * @param {Number} addressBookId
     * @return void
     */
    deleteAddressBook: function(addressBookId, callback) {
        this.pg.query(
            "DELETE FROM " + this.addressBooksTableName + " WHERE id=$1",
            [addressBookId],
            function(err, result) {
                if (err)
                    return callback(err);

                callback(null, result.rowCount === 1);
            }
        );
    },

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
    getCards: function(addressbookId, callback) {
        this.pg.query(
            "SELECT * FROM " + this.cardsTableName + " WHERE addressbookid=$1",
            [addressbookId],
            function(err, result) {
                if (err)
                    return callback(err);

                var cards = result.rows.map(function(card) {
                    return {
                        uri: card.uri,
                        carddata: card.carddata,
                        lastmodified: card.lastmodified
                    };
                });
                callback(null, cards);
            }
        );
    },

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
    getCard: function(addressBookId, cardUri, callback) {
        this.pg.query(
            "SELECT * FROM " + this.cardsTableName + " WHERE addressbookid=$1 AND uri=$2",
            [addressBookId, cardUri],
            function(err, result) {
                if (err)
                    return callback(err);

                if (result.rows.length === 0)
                    return callback(null, false);

                callback(null, {
                    uri: result.rows[0].uri,
                    carddata: result.rows[0].carddata,
                    lastmodified: result.rows[0].lastmodified
                });
            }
        );
    },

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
    createCard: function(addressBookId, cardUri, cardData, callback) {
        var self = this;

        this.pg.query(
            "INSERT INTO " + this.cardsTableName + " " +
            "(addressbookid, uri, carddata, lastmodified) VALUES " +
            "($1, $2, $3, $4)",
            [addressBookId, cardUri, cardData, new Date()],
            function(err, result) {
                if (err)
                    return callback(err);

                // Updates ctag.
                self.updateAddressBook(addressBookId, {}, function(err, success) {
                    if (err)
                        return callback(err);
                    callback(null, "\"" + Util.createHash(cardData) + "\"");
                });
            }
        );
    },

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
    updateCard: function(addressBookId, cardUri, cardData, callback) {
        var self = this;

        this.pg.query(
            "UPDATE " + this.cardsTableName + " SET " +
            "carddata = $1, lastmodified = $2 " +
            "WHERE addressbookid = $3 AND uri = $4",
            [cardData, new Date(), addressBookId, cardUri],
            function(err, result) {
                if (err)
                    return callback(err);

                // Updates ctag.
                self.updateAddressBook(addressBookId, {}, function(err, success) {
                    if (err)
                        return callback(err);

                    callback(null, "\"" + Util.createHash(cardData) + "\"");
                });
            }
        );
    },

    /**
     * Deletes a card
     *
     * @param {mixed} addressBookId
     * @param {String} cardUri
     * @return bool
     */
    deleteCard: function (addressBookId, cardUri, callback) {
        var self = this;

        this.pg.query(
            "DELETE FROM " + this.cardsTableName + " WHERE addressbookid=$1 AND uri=$2",
            [addressBookId, cardUri], 
            function(err, result) {
                if (err)
                    return callback(err);

                // updates ctag
                self.updateAddressBook(addressBookId, {}, function(err, success) {
                    if(err)
                        return callback(err);
                    callback(null, true);
                });
            }
        );
    }
});
