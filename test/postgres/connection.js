/*
 * @package jsDAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Daniel Laxar
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDBDAV_Backend_Postgres = require("../../lib/shared/backends/postgres.js");
var expect = require("chai").expect;
var client;
var db = require("./db.js");

describe("connection", function () {

    before(function (done) {
        db.init(done);
    });

    it("should correctly return a connection string", function () {
        expect(jsDBDAV_Backend_Postgres.getConnectionString({})).to.be.eq("postgres://localhost/jsdav");
        expect(jsDBDAV_Backend_Postgres.getConnectionString({username: "admin", password: "Admin"}))
            .to.be.eq("postgres://admin:Admin@localhost/jsdav");

        expect(jsDBDAV_Backend_Postgres.getConnectionString({db: "jsDAV"}))
            .to.be.eq("postgres://localhost/jsDAV");

        expect(jsDBDAV_Backend_Postgres.getConnectionString({port: 5000}))
            .to.be.eq("postgres://localhost:5000/jsdav");

        expect(jsDBDAV_Backend_Postgres.getConnectionString({host: "pg.local.host", port: 5000}))
            .to.be.eq("postgres://pg.local.host:5000/jsdav");
    });

    it("should establish a connection to a database", function (done) {
        jsDBDAV_Backend_Postgres.getConnection({}, function (err, cl) {
            client = cl;
            if (err) {
                return done(err);
            }


            client.query("SELECT NOW() as \"time\"", function (err, result) {
                if (err) {
                    return done(err);
                }

                expect(result.rows).to.have.length(1);
                done();
            });
        });
    });

    after(function (done) {
        client.end();
        db.cleanup(done);
    });
});
