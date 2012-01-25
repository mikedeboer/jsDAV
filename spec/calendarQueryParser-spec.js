// Test the calendar-query parser
//
"use strict";

var jsDAV_CalDAV_CalendarQueryParser = require('../lib/CalDAV/calendarQueryParser').jsDAV_CalDAV_CalendarQueryParser;
var Util = require('../lib/DAV/util');


function test_parse(xml) {
    var dom;
    Util.loadDOMDocument(xml, function(err, d) {
        // NB: loadDOMDocument is not really async, this will execute before test_parse returns
        if(err) throw err;
        dom = d;
    });
    return new jsDAV_CalDAV_CalendarQueryParser(dom);
}

describe('jsDAV_CalDAV_CalendarQueryParser', function() {
    describe('basic query parsing (from an iPhone)', function() {
        var parser = test_parse('<?xml version="1.0" encoding="UTF-8"?>\n'+
            '<C:calendar-query xmlns:C="urn:ietf:params:xml:ns:caldav">\n'+
            '  <A:prop xmlns:A="DAV:">\n'+
            '    <A:getcontenttype/>\n'+
            '    <A:getetag/>\n'+
            '  </A:prop>\n'+
            '  <C:filter>\n'+
            '    <C:comp-filter name="VCALENDAR">\n'+
            '      <C:comp-filter name="VEVENT">\n'+
            '        <C:time-range start="20110725T000000Z"/>\n'+
            '      </C:comp-filter>\n'+
            '    </C:comp-filter>\n'+
            '  </C:filter>\n'+
            '</C:calendar-query>');


        it('parses requested properties', function() {
            expect(parser.requestedProperties)
                .toEqual(['{DAV:}getcontenttype','{DAV:}getetag']);
        });

        it('parses comp-filter sections', function() {
            // Top level filter should be a VCALENDAR entry...
            expect(parser.filters.name).toEqual('VCALENDAR');

            var comp_fiters = parser.filters['comp-filters'];
            expect(comp_fiters.length).toEqual(1);
            expect(comp_fiters[0].name).toEqual('VEVENT');
        });

        it('parses time-range filters', function() {
            var time_range = parser.filters['comp-filters'][0]['time-range'];
            expect(time_range).toEqual({
                start: new Date(Date.UTC(2011,6,25)),
                end: null
            });
        });
    });
});
