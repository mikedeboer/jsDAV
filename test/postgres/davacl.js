/*
 * @package jsDAV
 * @subpackage DAVACL
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Daniel Laxar
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDBDAV_Backend_Postgres = require("../../lib/shared/backends/postgres.js");
var jsACLDAV_Backend_Postgres = require("../../lib/DAVACL/backends/postgres.js");
var db = require("./db.js");
var aclInstance;
var expect = require("chai").expect;
var client;

describe("davacl", function () {
    before(function(done) {
        db.init(function (err) {
            if (err) {
                done(err);
            }
            else {
                jsDBDAV_Backend_Postgres.getConnection(db.c, function(err, cl) {
                    if (err) {
                        return done(err);
                    }
                    else {
                        client = cl;
                        aclInstance = jsACLDAV_Backend_Postgres.new(client);

                        done();
                    }
                });
            }
        });
    });

    it("getPrincipalsByPrefix# should return an empty principal array if the prefix does not match", function(done) {
        aclInstance.getPrincipalsByPrefix("notexist/", function(err, users) {
            if (err) {
                return done(err);
            }

            expect(users).to.have.length(0);
            done();
        });
    });

    it("getPrincipalsByPrefix# should return a principal array if the prefix matches", function(done){
        aclInstance.getPrincipalsByPrefix("principals/", function(err, users) {
            if (err) {
                return done(err);
            }

            expect(users).to.be.an("array");
            expect(users).to.have.length(2);
            done();
        });
    });

    it("getPrincipalsByPath# should be undefined if the path does not match", function(done) {
        aclInstance.getPrincipalByPath("principals/daniel1", function(err, users) {
            if (err) {
                return done(err);
            }
            expect(users).to.be.undefined;
            done();
        });
    });

    it("getPrincipalsByPath# should return a principal array if the path matches", function(done){
        aclInstance.getPrincipalByPath("principals/daniel", function(err, users) {
            if (err) {
                return done(err);
            }
            expect(users).to.be.an("object");
            done();
        });
    });

    it("updatePrincipal# should update correctly", function(done) {
        aclInstance.updatePrincipal("principals/daniel", {"{DAV:}displayname": "Daniel (MOD)", "{http://ajax.org/2005/aml}vcard-url": "/newurl"}, function(err, result) {
            client.query("SELECT * FROM principals WHERE uri=$1", ["principals/daniel"], function(err, result) {
                if (err) {  
                    done(err);
                }
                else {
                    expect(result.rows).to.have.length(1);

                    expect(result.rows[0]).to.have.property("displayname")
                        .to.be.eq("Daniel (MOD)");

                    expect(result.rows[0]).to.have.property("vcardurl")
                        .to.be.eq("/newurl");

                    expect(result.rows[0]).to.have.property("displayname")
                        .not.to.be.eq("/newurl1");

                    done();
                }
            });
        });
    });

    it("searchPrincipal#");

    it("getGroupMemberSet# should return the right uri's", function(done) {
        aclInstance.getGroupMemberSet("groups/grp.daniel", function(err, members) {
            if (err) {
                return done(err);
            }
            expect(members).to.be.an("array");
            expect(members).to.be.deep.eq(["principals/me.daniel", "principals/daniel"]);
            done();
        });
    });

    it("getGroupMemberShip# should return an array with group uri's", function(done) {
        aclInstance.getGroupMemberShip("principals/me.daniel", function (err, groups) {
            if (err) {
                return done(err);
            }
            expect(groups).to.be.an("array");
            expect(groups).to.be.deep.eq(["groups/grp.daniel"]);
            done();
        });
    });

    it("setGroupMemberSet# should be able to subscribe groups", function(done) {
        aclInstance.setGroupMemberSet("groups/grp.daniel", ["principals/me.daniel"], function(err) {
            if (err) {
                return done(err);
            }
            client.query("SELECT COUNT(*) \"cnt\" FROM groupmembers WHERE \"group\"='groups/grp.daniel'", function(err, result) {
                if (err) {
                    return done(err);
                }
                expect(result.rows[0].cnt).to.be.eq(1);
                done();
            });
        });
    });

    after(function(done) {
        client.end();
        db.cleanup(done);
    });
});
