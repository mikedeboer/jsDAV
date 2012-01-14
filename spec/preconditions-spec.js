// Test jsDAV_Handler.checkPreconditions() for sanity
//
"use strict";


require('../lib/jsdav').debugMode = true;
var TestServer = require('./testserver').TestServer;
var TestFile = require('./testserver').TestFile;

var server = new TestServer([ ]);


describe('jsDAV_Handler.checkPreconditions', function() {
    var server = new TestServer([
        new TestFile('etag', {
            body: "I'm a teapot!",
            etag: '"bf049defdc367d10cb23730e66198a23"'
        })
    ]);

    it("should match If-Match and return 200", function(done) {
        server.request('GET', '/etag', {
            'If-Match': '"bf049defdc367d10cb23730e66198a23"'},
            function(code, headers, body) {
                expect(code).toEqual(200);
                expect(body).toEqual("I'm a teapot!");
                done();
        });
    });

    it("should not match If-Match and return 412", function(done) {
        server.request('GET', '/etag', {
            'If-Match': '"0123456789abcdef0123456789abcdef"'},
            function(code, headers, body) {
                expect(code).toEqual(412);
                done();
        });
    });

    it("should match If-None-Match and return 304", function(done) {
        server.request('GET', '/etag', {
            'If-None-Match': '"bf049defdc367d10cb23730e66198a23"'},
            function(code, headers, body) {
                expect(code).toEqual(304);
                done();
        });
    });

    it("should not match If-None-Match and return 200", function(done) {
        server.request('GET', '/etag', {
            'If-None-Match': '"0123456789abcdef0123456789abcdef"'},
            function(code, headers, body) {
                expect(code).toEqual(200);
                done();
        });
    });
});
