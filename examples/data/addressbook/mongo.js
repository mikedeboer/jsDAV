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

    var numOperations = 7
    var numOperationsSaved = 0;
    var collectionNames = Object.keys(collections);
    
    //create unique indexes

    mongo.collection("users").ensureIndex({username: 1}, {unique: true}, function(err) {
        if(err)
            return callback(err);
        else {
            numOperationsSaved++;
            if (numOperationsSaved === numOperations) callback(null, true);
        }
    })
    mongo.collection("addressbooks").ensureIndex({principaluri: 1}, {unique: true}, function(err) {
        if(err)
            return callback(err);
        else {
            numOperationsSaved++;
            if (numOperationsSaved === numOperations) callback(null, true);
        }        
    })
    mongo.collection("addressbooks").ensureIndex({uri: 1}, {unique: true}, function(err) {
        if(err)
            return callback(err);
        else {
            numOperationsSaved++;
            if (numOperationsSaved === numOperations) callback(null, true);
        }       
    })
    mongo.collection("principals").ensureIndex({uri: 1}, {unique: true}, function(err) {
        if(err)
            return callback(err);
        else {
            numOperationsSaved++;
            if (numOperationsSaved === numOperations) callback(null, true);
        }        
    })
    
    //insert dummy data

    collectionNames.forEach(function (collectionName) {
        mongo.collection(collectionName).insert(collections[collectionName], function (err, docs) {
            if (err) {
                return callback(err);
            } else {
                numOperationsSaved++;
                if (numOperationsSaved === numOperations) callback(null, true);
            }
        })
    })

};