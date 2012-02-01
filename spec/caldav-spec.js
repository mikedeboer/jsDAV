"use strict";


//require('../lib/jsdav').debugMode = true;
var TestServer = require('./caldav_testserver').CalDAVTestServer;


describe('CalDAV plugin', function() {
    var server = new TestServer({
        users: {
            'admin': {
                password: 'admin'
            }
        }
    });

    var auth_header = 'Basic '+(new Buffer("admin:admin")).toString('base64');

    // Authorization is a prerequisite for CalDAV, but these
    // tests really belong in their own auth-spec.js file
    describe('authorization', function() {
        it('rejects unauthorized users', function(done) {
            server.request('GET', '/principals/admin',
                function(code, headers, body) {
                    expect(code).toEqual(401);
                    done();
                });
        });

        it('accepts authorized users', function(done) {
            server.request('GET', '/principals/admin', {
                'Authorization': auth_header },
                function(code, headers, body) {
                    expect(code).toEqual(200);
                    done();
                });
        });
    });

    it('rejects invalid iCal data', function(done) {
        server.request('PUT', '/calendars/admin/calendar/test_1.ics', {
            'Authorization': auth_header,
            'Content-Type': 'application/ical' },
            '** This is not valid ical data...',
            function(code, headers, body) {
                expect(code).toEqual(415);
                done();
        });
    });

    it('accepts valid iCal data', function(done) {
        server.request('PUT', '/calendars/admin/calendar/test_1.ics', {
            'Authorization': auth_header,
            'Content-Type': 'application/ical' },
            'BEGIN:VCALENDAR\r\n'+
            'PRODID:-//Google Inc//Google Calendar 70.9054//EN\r\n'+
            'VERSION:2.0\r\n'+
            'BEGIN:VEVENT\r\n'+
            'DTSTART:20110926T150000Z\r\n'+
            'DTEND:20110926T160000Z\r\n'+
            'DTSTAMP:20111206T175451Z\r\n'+
            'UID:jmdoebbto9vubpjf32aokpojb4@google.com\r\n'+
            'CREATED:20110913T133341Z\r\n'+
            'LAST-MODIFIED:20110913T133341Z\r\n'+
            'SUMMARY:Girl Scout Cadettes\r\n'+
            'END:VEVENT\r\n'+
            'END:VCALENDAR\r\n',
            function(code, headers, body) {
                expect(code).toEqual(201);
                done();
        });
        done();
    });
});
