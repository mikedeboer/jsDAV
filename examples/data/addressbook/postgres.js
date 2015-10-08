/*
 * @package jsDAV
 * @subpackage CalDAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Daniel Laxar
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var Async = require("asyncjs");

exports.init = function(pg, skipInit, callback) {
    if (skipInit)
        return callback(null);

    var operations = [
        // Create unique indexes.
        {
            query: "CREATE TABLE users (" +
                       "username VARCHAR(50)," +
                       "password TEXT" +
                   ")"
        },
        {
            query: "CREATE TABLE principals (" +
                       "uri VARCHAR(150) primary key, " +
                       "displayname VARCHAR(50), " +
                       "email TEXT, " +
                       "vcardurl TEXT " +
                   ")"
        },
        {
            query: "CREATE TABLE groupmembers (" +
                       "\"group\" VARCHAR(150) references principals(uri)," +
                       "member VARCHAR(150) references principals(uri)" +
                   ")"
        },
        {
            query: "CREATE TABLE addressbooks (" +
                       "id SERIAL PRIMARY KEY, " +
                       "uri VARCHAR(150), " +
                       "principaluri VARCHAR(150) references principals(uri)," +
                       "description TEXT, " +
                       "displayname VARCHAR(50), " +
                       "ctag INT " +
                   ")"
        },
        {
            query: "CREATE TABLE cards (" +
                       "uri VARCHAR(250), " +
                       "lastmodified TIMESTAMP," +
                       "addressbookid INT references addressbooks(id), " +
                       "carddata TEXT " +
                   ")"
        },
        {
            query: "INSERT INTO users (username, password) VALUES($1, $2)",
            values: ["admin", "6838d8a7454372f68a6abffbdb58911c"]
        },
        {
            query: "INSERT INTO principals (uri, email, displayname, vcardurl) VALUES($1, $2, $3, $4)",
            values: ["principals/admin", "admin@example.com", "Administrator", ""]
        },
        {
            query: "INSERT INTO addressbooks (principaluri, displayname, uri, description, ctag) VALUES($1, $2, $3, $4, $5)",
            values: ["principals/admin", "default addressbook", "admin", "", 0]
        }
    ];

    Async.list(operations)
        .each(function(op, next) {
            pg.query(op.query, op.values || [], next);
        })
        .end(callback);
};
