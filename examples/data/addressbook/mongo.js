/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax.org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @author Wouter Vroege <wouter AT woutervroege DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var Async = require("asyncjs");

exports.init = function(mongo, skipInit, callback) {
    if (skipInit)
        return callback(null);

    var operations = [
        // create unique indexes
        {
            type: "index",
            collection: "users",
            data: {username: 1}
        },
        {
            type: "index",
            collection: "addressbooks",
            data: {principaluri: 1}
        },
        {
            type: "index",
            collection: "addressbooks",
            data: {uri: 1}
        },
        {
            type: "index",
            collection: "principals",
            data: {uri: 1}
        },
        //dummy data
        {
            type: "data",
            collection: "addressbooks",
            data: [{
                "principaluri": "principals/admin",
                "displayname": "default addressbook",
                "uri": "admin",
                "description": "",
                "ctag": 0
            }]
        },
        {
            type: "data",
            collection: "principals",
            data: [{
                "uri": "principals/admin",
                "email": "admin@example.org",
                "displayname": "Administrator",
                "vcardurl": ""
            }]
        },
        {
            type: "data",
            collection: "users",
            data: [{
                "username": "admin",
                "password": "6838d8a7454372f68a6abffbdb58911c"
            }]
        }
    ];
    // drop database, create new...
    mongo.dropDatabase(function() {
        Async.list(operations)
            .each(function(op, next) {
                var coll = mongo.collection(op.collection);
                if (op.type == "index")
                    coll.ensureIndex(op.data, {unique: true}, next);
                else
                    coll.insert(op.data, next);
            }).end(callback);
    });
};
