// Test jsDAV_Handler.checkPreconditions() for sanity
//
"use strict";


//require('../lib/jsdav').debugMode = true;
var TestServer = require('./testserver').TestServer;
var TestFile = require('./testserver').TestFile;

var server = new TestServer([ ]);


var MODIFIED_DATE = 'Thu, 12 Jan 2012 20:17:25 GMT';


describe('jsDAV_Handler.checkPreconditions', function() {
    var server = new TestServer([
        new TestFile('etag', {
            body: "I'm a teapot!",
            etag: '"bf049defdc367d10cb23730e66198a23"'
        }),
        new TestFile('isnotmodified', {
            last_modified: new Date(MODIFIED_DATE).getTime()
        }),
        new TestFile('ismodified', {
            last_modified: new Date(MODIFIED_DATE).getTime() + 2*60*60*1000 // +2 hours
        }),
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


    it("should return 200 for modified nodes", function(done) {
        server.request('GET', '/ismodified', {
            'If-Modified-Since': MODIFIED_DATE},
            function(code, headers, body) {
                expect(code).toEqual(200);
                done();
        });
    });

    it("should return 304 for unmodified nodes", function(done) {
        server.request('GET', '/isnotmodified', {
            'If-Modified-Since': MODIFIED_DATE},
            function(code, headers, body) {
                expect(code).toEqual(304);
                done();
        });
    });


    it("should return 412 for modified nodes with If-Unmodified-Since", function(done) {
        server.request('GET', '/ismodified', {
            'If-Unmodified-Since': MODIFIED_DATE},
            function(code, headers, body) {
                expect(code).toEqual(412);
                done();
        });
    });

    it("should return 200 for unmodified nodes with If-Unmodified-Since", function(done) {
        server.request('GET', '/isnotmodified', {
            'If-Unmodified-Since': MODIFIED_DATE},
            function(code, headers, body) {
                expect(code).toEqual(200);
                done();
        });
    });
});
