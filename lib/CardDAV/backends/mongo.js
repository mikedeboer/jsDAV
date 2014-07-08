/*
 * @package jsDAV
 * @subpackage CardDAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @author Wouter Vroege <wouter AT woutervroege DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsCardDAV_iBackend = require("./../interfaces/iBackend");
var jsCardDAV_Plugin = require("./../plugin");
var jsCardDAV_Property_SupportedAddressData = require("./../property/supportedAddressData");

var Db = require("./../../shared/backends/mongo");
var Exc = require("./../../shared/exceptions");
var Util = require("./../../shared/util");

/**
 * Mongo CardDAV backend
 *
 * This CardDAV backend uses Mongo to store addressbooks
 */
var jsCardDAV_Backend_Mongo = module.exports = jsCardDAV_iBackend.extend({
    /**
     * Mongo connection
     *
     * @var mongo
     */
    mongo: null,

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
     * @param Mongo mongo
     * @param {String} addressBooksTableName
     * @param {String} cardsTableName
     */
    initialize: function(mongo, addressBooksTableName, cardsTableName) {
        this.mongo = mongo;
        this.addressBooksTableName = addressBooksTableName || "addressbooks";
        this.cardsTableName = cardsTableName || "cards";
        this.BSON = require("mongodb").BSONPure;
    },

    /**
     * Returns the list of addressbooks for a specific user.
     *
     * @param {String} principalUri
     * @return array
     */
    getAddressBooksForUser: function(principalUri, callback) {
        var self = this;
        self.mongo.collection(this.addressBooksTableName).find({
            principaluri: principalUri
        }).toArray(function (err, docs) {
            if (err)
                return callback(err);
            else if (!docs || !docs.length)
                return callback(null, [])

            var addressBooks = [];
            docs.forEach(function (doc) {
                addressBooks.push({
                    id: doc._id,
                    uri: doc.uri,
                    principaluri: doc.principaluri,
                    "{DAV:}displayname": doc.displayname,
                    "{http://calendarserver.org/ns/}getctag": doc.ctag,
                    "{urn:ietf:params:xml:ns:carddav}addressbook-description": doc.description,
                    "{urn:ietf:params:xml:ns:carddav}supported-address-data": jsCardDAV_Property_SupportedAddressData.new()
                });
            });
            callback(null, addressBooks);
        });
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
        var newValue;
        for (var property in mutations) {
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

        var self = this;
        self.mongo.collection(self.addressBooksTableName).update({
            _id: new self.BSON.ObjectID(addressBookId)
        }, {
            $set: {
                displayname: updates.displayname,
                description: updates.description,
            },
            $inc: {
                ctag: 1
            }
        }, function(err, doc) {
            if (err)
                return callback(err)
            callback(null, true);
        });
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
            "displayname": null,
            "description": null,
            "principaluri": principalUri,
            "uri": url,
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

        this.mongo.collection(this.addressBooksTableName).insert(values, function(err, doc) {
            if (err)
                return callback(err)
            callback(null, doc);
        });
    },

    /**
     * Deletes an entire addressbook and all its contents
     *
     * @param {Number} addressBookId
     * @return void
     */
    deleteAddressBook: function(addressBookId, callback) {
        var self = this;
        this.mongo.collection(this.addressBooksTableName).remove({
            _id: new this.BSON.ObjectID(addressBookId)
        }, function (err) {
            if (err)
                return callback(err);

            self.mongo.collection(self.cardsTableName).remove({
                addressbookid: new self.BSON.ObjectID(addressBookId)
            }, function(err) {
                if (err)
                    return callback(err);
                callback(null, true);
            });
        });
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
        this.mongo.collection(this.cardsTableName).find({
            addressbookid: addressbookId
        }).toArray(function (err, docs) {
            if (err)
                return callback(err)
            if (!docs || !docs.length)
                return callback(null, []);

            var cards = [];
            docs.forEach(function (card) {
                cards.push({
                    uri: card.uri,
                    carddata: card.carddata,
                    lastmodified: card.lastmodified
                });
            });

            callback(null, cards);
        });
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
        var self = this;
        this.mongo.collection(this.cardsTableName).findOne({
            uri: cardUri
        }, function(err, doc) {
            if (err)
                return callback(err);
            if (!doc)
                return callback(null, false);
            
            callback(null, {
                uri: doc.uri,
                carddata: doc.carddata,
                lastmodified: doc.lastmodified
            });
        });
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
        var now = Date.now();

        this.mongo.collection(this.cardsTableName).insert({
            addressbookid: addressBookId,
            uri: cardUri,
            carddata: cardData,
            lastmodified: now
        }, function(err, docs) {
            if (err)
                return callback(err);

            self.mongo.collection(self.addressBooksTableName).update({
                _id: addressBookId
            }, {
                $inc: {
                    ctag: 1
                }
            }, function(err, docs) {
                if (err)
                    return callback(err)
                callback(null, "\"" + Util.createHash(cardData) + "\"");
            });
        });
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
        var now = Date.now();
        this.mongo.collection(this.cardsTableName).update({
            uri: cardUri
        }, {
            $set: {
                carddata: cardData,
                lastmodified: now
            }
        }, function(err, docs) {
            if (err)
                return callback(err);

            self.mongo.collection(self.addressBooksTableName).update({
                _id: addressBookId
            }, {
                $inc: {
                    ctag: 1
                }
            }, function(err, docs) {
                if (err)
                    return callback(err)
                callback(null, "\"" + Util.createHash(cardData) + "\"");
            });
        })
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
        this.mongo.collection(this.cardsTableName).remove({
            uri: cardUri
        }, function(err) {
            if (err)
                return callback(err);

            self.mongo.collection(self.addressBooksTableName).update({
                _id: addressBookId
            }, {
                $inc: {
                    ctag: 1
                }
            }, function(err, docs) {
                if (err)
                    return callback(err)
                callback(null, true);
            });
        });
    }
});
