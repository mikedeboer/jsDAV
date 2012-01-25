"use strict";

var icalendar = require('icalendar');
var jsDAV_CalDAV_CalendarQueryValidator = require('../lib/CalDAV/calendarQueryValidator').jsDAV_CalDAV_CalendarQueryValidator;


var CALENDAR_OBJECTS = {
  a: 'BEGIN:VCALENDAR\r\n'+
     'PRODID:-//Tri Tech Computers//node-icalendar//EN\r\n'+
     'VERSION:2.0\r\n'+
     'BEGIN:VEVENT\r\n'+
     'DTSTAMP:20120124T152435\r\n'+
     'UID:fda36637a7b8d4d4dbb911b315075673@daybilling.com\r\n'+
     'DTSTART:20110613T091500Z\r\n'+
     'DURATION:PT15M\r\n'+
     'SUMMARY:Test Event 1\r\n'+
     'END:VEVENT\r\n'+
     'END:VCALENDAR\r\n',

  b: 'BEGIN:VCALENDAR\r\n'+
     'VERSION:2.0\r\n'+
     'PRODID:-//ABC Corporation//NONSGML My Product//EN\r\n'+
     'BEGIN:VTODO\r\n'+
     'DTSTAMP:19980130T134500Z\r\n'+
     'SEQUENCE:2\r\n'+
     'UID:uid4@host1.com\r\n'+
     'ORGANIZER:MAILTO:unclesam@us.gov\r\n'+
     'ATTENDEE;PARTSTAT=ACCEPTED:MAILTO:jqpublic@example.com\r\n'+
     'DUE:19980415T235959\r\n'+
     'STATUS:NEEDS-ACTION\r\n'+
     'SUMMARY:Submit Income Taxes\r\n'+
     'BEGIN:VALARM\r\n'+
     'ACTION:AUDIO\r\n'+
     'TRIGGER:19980403T120000\r\n'+
     'ATTACH;FMTTYPE=audio/basic:http://example.com/pub/audio-\r\n'+
     ' files/ssbanner.aud\r\n'+
     'REPEAT:4\r\n'+
     'DURATION:PT1H\r\n'+
     'END:VALARM\r\n'+
     'END:VTODO\r\n'+
     'END:VCALENDAR\r\n',

  c: 'BEGIN:VCALENDAR\r\n'+
     'PRODID:-//Tri Tech Computers//node-icalendar//EN\r\n'+
     'VERSION:2.0\r\n'+
     'BEGIN:VEVENT\r\n'+
     'DTSTAMP:20120124T152435\r\n'+
     'UID:fda36637a7b8d4d4dbb911b315075673@daybilling.com\r\n'+
     'DTSTART:20120613T091500Z\r\n'+
     'DURATION:PT15M\r\n'+
     'SUMMARY:Test Event 2\r\n'+
     'END:VEVENT\r\n'+
     'END:VCALENDAR\r\n',
};


function test_filters(test_items, filters) {
    var result = [];
    var validator = new jsDAV_CalDAV_CalendarQueryValidator();
    for(var i=0; i<test_items.length; ++i) {
        var id = test_items[i];
        var cal = icalendar.parse_calendar(CALENDAR_OBJECTS[id]);
        if(validator.validate(cal, filters))
            result.push(id);
    }
    return result.sort();
}



describe('jsDAV_CalDAV_CalendarQueryValidator', function() {
    it('filters out incorrect components', function() {
        expect(test_filters(['a','b'], { 
            name: 'VCALENDAR',
            'comp-filters': [
                { name: 'VEVENT' }
                ]
                }))
            .toEqual(['a']);
    });

    it('filters items outside a time-range', function() {
        expect(test_filters(['a','c'], {
            name: 'VCALENDAR',
            'comp-filters': [
                { name: 'VEVENT',
                  'time-range': {
                      start: new Date(Date.UTC(2012, 0, 1))
                      }
                }
                ]
            }))
            .toEqual(['c']);
    });

    it('matches nested comp-filters', function() {
        expect(test_filters(['b'], {
            name: 'VCALENDAR',
            'comp-filters': [{
                name: 'VTODO',
                'comp-filters': [ { name: 'VALARM' } ]
                }]
            }))
            .toEqual(['b']);
    });
});
