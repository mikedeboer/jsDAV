/*
 * @package jsDAV
 * @subpackage CalDAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsCardDAV_iBackend = require("./../interfaces/iBackend");
var jsCardDAV_Plugin = require("./../plugin");
var jsCardDAV_Property_SupportedAddressData = require("./../property/supportedAddressData");

var Db = require("./../../shared/backends/redis");
var Exc = require("./../../shared/exceptions");
var Util = require("./../../shared/util");

/**
 * Redis CardDAV backend
 *
 * This CardDAV backend uses Redis to store addressbooks
 */
var jsCardDAV_Backend_Redis = module.exports = jsCardDAV_iBackend.extend({
    /**
     * Redis connection
     *
     * @var redis
     */
    redis: null,

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
     * @param Redis redis
     * @param {String} addressBooksTableName
     * @param {String} cardsTableName
     */
    initialize: function(redis, addressBooksTableName, cardsTableName) {
        this.redis = redis;
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
        var self = this;
        this.redis.hget(this.addressBooksTableName + "/principalUri", principalUri, function(err, res) {
            if (err)
                return callback(err);
            
            if (!res)
                return callback(null, []);

            var ids;
            try {
                ids = JSON.parse(res.toString("utf8"));
            }
            catch (ex) {
                return callback(ex);
            }
            
            var commands = ids.map(function(id) {
                return ["HMGET", self.addressBooksTableName + "/" + id, "uri", "principaluri", "displayname", "description", "ctag"];
            });
            
            self.redis.multi(commands).exec(function(err, res) {
                if (err)
                    return callback(err);
                
                var addressBooks = Db.fromMultiBulk(res).map(function(data, idx) {
                    var obj = {
                        id : ids[idx],
                        uri: data[0],
                        principaluri: data[1],
                        "{DAV:}displayname": data[2],
                        "{http://calendarserver.org/ns/}getctag": data[4]
                    };
                    obj["{" + jsCardDAV_Plugin.NS_CARDDAV + "}addressbook-description"] = data[3];
                    obj["{" + jsCardDAV_Plugin.NS_CARDDAV + "}supported-address-data"] = jsCardDAV_Property_SupportedAddressData.new();
                    return obj;
                });
                
                callback(null, addressBooks);
            });
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
                case "{DAV:}displayname" :
                    updates.displayname = newValue;
                    break;
                case "{" + jsCardDAV_Plugin.NS_CARDDAV + "}addressbook-description" :
                    updates.description = newValue;
                    break;
                default :
                    // If any unsupported values were being updated, we must
                    // let the entire request fail.
                    return callback(null, false);
            }
        }

        // No values are being updated?
        if (!Object.keys(updates).length)
            return callback(null, false);

        var self = this;
        this.redis.hget(this.addressBooksTableName + "/" + addressBookId, "ctag", function(err, res) {
            if (err)
                return callback(err);
            
            var ctag = parseInt(res.toString("utf8"), 10);
            var command = [self.addressBooksTableName + "/" + addressBookId, "ctag", ++ctag];
            for (var property in updates)
                command.push(property, updates[property]);
            command.push(function(err) {
                if (err)
                    return callback(err);
                callback(null, true);
            });
            self.redis.hmset.apply(self.redis, command);
        })
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
        };

        var newValue;
        for (var property in properties) {
            newValue = properties[property];
            
            switch (property) {
                case "{DAV:}displayname" :
                    values.displayname = newValue;
                    break;
                case "{" + jsCardDAV_Plugin.NS_CARDDAV + "}addressbook-description" :
                    values.description = newValue;
                    break;
                default :
                    return callback(new Exc.BadRequest("Unknown property: " + property));
            }
        }

        var self = this;
        this.redis.hget(this.addressBooksTableName + "/principalUri", principalUri, function(err, res) {
            if (err)
                return callback(err);
            
            var ids;
            try {
                ids = JSON.parse(res.toString("utf8"));
            }
            catch (ex) {
                ids = [];
            }
            
            self.redis.incr(self.addressBooksTableName + "/ID", function(err, id) {
                if (err)
                    return callback(err);
                
                ids.push(id);
                var commands = [
                    ["HSET", self.addressBooksTableName + "/principalUri", principalUri, JSON.stringify(ids)]
                ];
                var hmset = ["HMSET", self.addressBooksTableName + "/" + id, "ctag", 1];
                for (var property in values) {
                    hmset.push(property, values[property]);
                }
                commands.push(hmset);
                self.redis.multi(commands).exec(callback);
            });
        });
    },

    /**
     * Deletes an entire addressbook and all its contents
     *
     * @param {Number} addressBookId
     * @return void
     */
    deleteAddressBook: function(addressBookId, callback) {
        var commands = [
            ["DEL", this.addressBooksTableName + "/" + addressBookId],
            ["DEL", this.addressBooksTableName + "/" + addressBookId + "/" + this.cardsTableName]
        ];
        var self = this;
        // fetch the principalUri to be able to retrieve the array of addressbooks. 
        this.redis.hget(this.addressBooksTableName + "/" + addressBookId, "principaluri", function(err, res) {
            if (err)
                return callback(err);
                
            var principalUri = res.toString("utf8");
            // fetch the addressbook array for this principalUri
            self.redis.hget(self.addressBooksTableName + "/principalUri", principalUri, function(err, res) {
                if (err || !res)
                    return callback(err);
                
                var ids;
                try {
                    ids = JSON.parse(res.toString("utf8"));
                }
                catch (ex) {
                    ids = [];
                }
                var idx = ids.indexOf(addressBookId);
                if (idx > -1)
                    ids.splice(idx, 1);
                
                commands.push(["HSET", self.addressBooksTableName + "/principalUri", principalUri, JSON.stringify(ids)]);
                // fetch the list of card IDs
                self.redis.zrange(self.addressBooksTableName + "/" + addressBookId + "/" + self.cardsTableName, 0, -1, function(err, res) {
                    if (err)
                        return callback(err);
                        
                    if (res) {
                        Db.fromMultiBulk(res).forEach(function(cardUri) {
                            commands.push(["DEL", self.cardsTableName + "/" + addressBookId + "/" + cardUri]);
                        });
                    }
                    self.redis.multi(commands).exec(callback)
                });
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
        var self = this;
        // fetch the list of card IDs
        self.redis.zrange(this.addressBooksTableName + "/" + addressbookId + "/" + this.cardsTableName, 0, -1, function(err, res) {
            if (err)
                return callback(err);
                
            var cardUris = Db.fromMultiBulk(res);
            var commands = cardUris.map(function(cardUri) {
                return ["HMGET", self.cardsTableName + "/"+ addressbookId + "/" + cardUri, "carddata", "lastmodified"];
            });
            self.redis.multi(commands).exec(function(err, res) {
                if (err)
                    return callback(err);
                if (!res || !res.length)
                    return callback(null, []);
                
                var cards = [];
                Db.fromMultiBulk(res).map(function(data, idx) {
                    if (!data[0] && !data[1])
                        return;
                    cards.push({
                        uri: cardUris[idx],
                        carddata: data[0],
                        lastmodified: parseInt(data[1], 10)
                    });
                });
                callback(null, cards);
            });
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
        this.redis.hmget(this.cardsTableName + "/" + addressBookId + "/" + cardUri, "carddata", "lastmodified", function(err, res) {
            if (err)
                return callback(err);
            
            res = Db.fromMultiBulk(res);
            if (!res || !res.length || (!res[0] && !res[1]))
                return callback();

            callback(null, {
                uri: cardUri,
                carddata: res[0],
                lastmodified: parseInt(res[1], 10)
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
        var commands = [
            ["HMSET", this.cardsTableName + "/" + addressBookId + "/" + cardUri, "carddata", cardData, "lastmodified", now],
            ["ZADD", this.addressBooksTableName + "/" + addressBookId + "/" + this.cardsTableName, now, cardUri]
        ];
        this.redis.hget(this.addressBooksTableName + "/" + addressBookId, "ctag", function(err, ctag) {
            if (err)
                return callback(err);
            
            ctag = parseInt(ctag.toString("utf8"), 10);
            commands.push(["HSET", self.addressBooksTableName + "/" + addressBookId, "ctag", ++ctag]);
            self.redis.multi(commands).exec(function(err) {
                if (err)
                    return callback(err);
                callback(null, "\"" + Util.md5(cardData) + "\"");
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
        var commands = [
            ["HMSET", this.cardsTableName + "/" + addressBookId + "/" + cardUri, "carddata", cardData, "lastmodified", now]
        ];
        this.redis.hget(this.addressBooksTableName + "/" + addressBookId, "ctag", function(err, ctag) {
            if (err)
                return callback(err);
            
            ctag = parseInt(ctag.toString("utf8"), 10);
            commands.push(["HSET", self.addressBooksTableName + "/" + addressBookId, "ctag", ++ctag]);
            self.redis.multi(commands).exec(function(err) {
                if (err)
                    return callback(err);
                callback(null, "\"" + Util.md5(cardData) + "\"");
            });
        });
    },

    /**
     * Deletes a card
     *
     * @param {mixed} addressBookId
     * @param {String} cardUri
     * @return bool
     */
    deleteCard: function(addressBookId, cardUri, callback) {
        var self = this;
        var commands = [
            ["DEL", this.cardsTableName + "/" + addressBookId + "/" + cardUri],
            ["ZREM", this.addressBooksTableName + "/" + addressBookId + "/" + this.cardsTableName, cardUri]
        ];
        this.redis.hget(this.addressBooksTableName + "/" + addressBookId, "ctag", function(err, ctag) {
            if (err)
                return callback(err);
            
            ctag = parseInt(ctag.toString("utf8"), 10);
            commands.push(["HSET", self.addressBooksTableName + "/" + addressBookId, "ctag", ++ctag]);
            self.redis.multi(commands).exec(function(err) {
                if (err)
                    return callback(err);
                callback(null, true);
            });
        });
    }
});
