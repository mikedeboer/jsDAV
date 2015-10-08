/*
 * @package jsDAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Daniel Laxar
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var pg = require("pg");
var async = require("asyncjs");
var c = {
    db: "jsdav_test",
    database: "jsdav_test"
};

module.exports = {
    c: c, 
    init: function (callback) {
        pg.connect("postgres://localhost", function (err, client, done) {
            if (err) {
                callback(err);
            }
            else {
                async.list([
                    client.query.bind(client, "CREATE DATABASE jsdav_test")
                ]).call().end(function(err, result) {
                    done();
                    if (err) {
                        callback(err);
                    }
                    else {
                        pg.connect(c, function(err, client, done) {
                            if (err) {
                                callback(err);
                            }
                            else {
                                async.list([
                                    client.query.bind(client, 
                                        "CREATE TABLE users (" + 
                                        "username VARCHAR(50)," + 
                                        "password TEXT" +
                                        ")"),
                                    client.query.bind(client, 
                                        "CREATE TABLE principals (" + 
                                        "uri VARCHAR(150) primary key, " + 
                                        "displayname VARCHAR(50), " + 
                                        "email TEXT, " + 
                                        "vcardurl TEXT " + 
                                        ")"),
                                    client.query.bind(client, "INSERT INTO users (username, password) VALUES ('daniel', 'abc')"), 
                                    client.query.bind(client, "INSERT INTO principals (displayname, email, uri) VALUES ('Daniel (DISP)', 'abc@def.com', 'principals/me.daniel')"), 
                                    client.query.bind(client, "INSERT INTO principals (displayname, uri, email, vcardurl) VALUES ('Daniel Laxar (DISP)', 'principals/daniel', 'daniel@local.host', '/nothereurl')"), 
                                    client.query.bind(client, "INSERT INTO principals (displayname, email, uri) VALUES ('grp.daniel', 'grp@local.host', 'groups/grp.daniel')"), 
                                    client.query.bind(client, 
                                        "CREATE TABLE groupmembers (" + 
                                        "\"group\" VARCHAR(150) references principals(uri)," +
                                        "member VARCHAR(150) references principals(uri)" +
                                        ")"), 
                                    client.query.bind(client, "INSERT INTO groupmembers (\"group\", member) VALUES ('groups/grp.daniel', 'principals/me.daniel')"),
                                    client.query.bind(client, "INSERT INTO groupmembers (\"group\", member) VALUES ('groups/grp.daniel', 'principals/daniel')"),
                                    client.query.bind(client, 
                                        "CREATE TABLE addressbooks (" + 
                                        "id SERIAL PRIMARY KEY, " +
                                        "uri VARCHAR(150), " + 
                                        "principaluri VARCHAR(150) references principals(uri)," + 
                                        "description TEXT, " + 
                                        "displayname VARCHAR(50), " + 
                                        "ctag INT " + 
                                        ")"),
                                    client.query.bind(client, "INSERT INTO addressbooks (uri, principaluri, ctag) VALUES ('addr', 'principals/me.daniel', 1)"), 
                                    client.query.bind(client, "INSERT INTO addressbooks (uri, principaluri, ctag) VALUES ('upme', 'principals/daniel', 1)"), 
                                    client.query.bind(client, "INSERT INTO addressbooks (uri, principaluri, ctag) VALUES ('delme', 'principals/daniel', 1)"), 

                                    client.query.bind(client, 
                                        "CREATE TABLE cards (" + 
                                        "uri VARCHAR(250), " + 
                                        "lastmodified TIMESTAMP," + 
                                        "addressbookid INT references addressbooks(id), " + 
                                        "carddata TEXT " + 
                                        ")"),

                                    client.query.bind(client, 
                                        "INSERT INTO cards (uri, lastmodified, addressbookid, carddata) " + 
                                        "VALUES ('card01.vcf', '2013-06-17', 1, 'BEGIN:VCARD\\nEND:VCARD' )"), 
                                    client.query.bind(client, 
                                        "INSERT INTO cards (uri, lastmodified, addressbookid, carddata) " + 
                                        "VALUES ('card02.vcf', '2013-06-17', 1, 'BEGIN:VCARD\\nEND:VCARD' )"), 
                                ]).call().end(function(err, result) {
                                    done(true); // need to really disconnect
                                    if (err) {
                                        callback(err);
                                    } 
                                    else {
                                        callback();
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    }, 

    cleanup: function(callback) {
        pg.connect("postgres://localhost", function (err, client, done) {
            if (err) {
                callback(err);
            }
            else {
                client.query("DROP DATABASE jsdav_test;", function (err, result) {
                    done();
                    callback(err, result);
                });
            }
        });
    }
};
