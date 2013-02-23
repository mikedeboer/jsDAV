/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax.org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @author Wouter Vroege <wouter AT woutervroege DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

exports.init = function (mongo, skipInit, callback) {

    if (skipInit) {
        console.log("skipping db init");
        return callback(null, true);
    }

    //dummy data

    var collections = {
        addressbooks: [{
            "principaluri": "principals/admin",
            "displayname": "default addressbook",
            "uri": "admin",
            "description": "",
            "ctag": 0
        }],
        principals: [{
            "uri": "principals/admin",
            "email": "admin@example.org",
            "displayname": "Administrator",
            "vcardurl": ""
        }],
        users: [{
            "username": "admin",
            "password": "6838d8a7454372f68a6abffbdb58911c"
        }]
    }

    var numCollectionsSaved = 0;
    var collectionNames = Object.keys(collections);

    collectionNames.forEach(function (collectionName) {
        mongo.collection(collectionName).insert(collections[collectionName], function (err, docs) {
            if (err) {
                return callback(err);
            } else {
                numCollectionsSaved++;
                if (numCollectionsSaved === collectionNames.length) callback(null, true);
            }
        })
    })

};