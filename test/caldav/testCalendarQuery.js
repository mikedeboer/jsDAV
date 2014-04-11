var assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    xmldom = require('xmldom'),
    parser = new xmldom.DOMParser(),
    events = [],
    queries = {},
    queryRoot = path.join(__dirname, '../assets/caldav/calendar-queries'),
    eventsRoot = path.join(__dirname, '../assets/caldav/calendar-items'),
    reader = require('../../lib/VObject/reader').new(),
    CalendarQueryParser = require('../../lib/CalDAV/calendarQueryParser'),
    validator = require('../../lib/CalDAV/calendarQueryValidator').new(),
    Xml = require("../../lib/shared/xml");

require('../../lib/CalDAV/plugin');

describe("Calendar queries", function(){

    before(function() {

        var list = fs.readdirSync(queryRoot);

        list.forEach(function(q){
            queries[path.basename(q, '.xml')] =
                parser.parseFromString(fs.readFileSync(path.join(queryRoot, q), 'utf-8'));
        });

        list = fs.readdirSync(eventsRoot);

        list.forEach(function(q){
            events.push(reader.read(fs.readFileSync(path.join(eventsRoot, q), 'utf-8')));
        });

        Xml.xmlNamespaces[this.NS_CALDAV] = "cal";
        Xml.xmlNamespaces[this.NS_CALENDARSERVER] = "cs";
        Xml.xmlNamespaces['urn:DAV'] = 'dav';

    });

    describe("CalendarQueryParser", function() {

        it("Can parse calendar-query XML documents", function(){

            assert.equal(Object.keys(queries).length, 4);

            Object.keys(queries).forEach(function(qN){
                var cqParser = CalendarQueryParser.new(queries[qN].documentElement);
                cqParser.parse();
                assert('filters' in cqParser, 'Parser has filters');
                assert(cqParser.filters, 'Filters is not empty');
            });

        });

    });

    describe("CalendarQueryValidator", function() {

        it("CalDAV Spec 7.8.1. Example: Partial Retrieval of Events by Time Range", function(){

            var cqParser = CalendarQueryParser.new(queries.eventsByRange);
            cqParser.parse();

            var filtered = events.filter(function(event){
                return validator.validate(event, cqParser.filters);
            });

            assert.equal(filtered.length, 2);

        });

        it("CalDAV Spec 7.8.6. Example: Retrieval of Event by UID", function(){

            var cqParser = CalendarQueryParser.new(queries.eventByUID);
            cqParser.parse();

            var filtered = events.filter(function(event){
                return validator.validate(event, cqParser.filters);
            });

            assert.equal(filtered.length, 1);

        });

        it("CalDAV Spec 7.8.7. Example: Retrieval of Events by PARTSTAT", function(){

            var cqParser = CalendarQueryParser.new(queries.eventsByPartstat);
            cqParser.parse();

            var filtered = events.filter(function(event){
                return validator.validate(event, cqParser.filters);
            });

            assert.equal(filtered.length, 1);

        });

        it("CalDAV Spec 7.8.8. Example: Retrieval of Events Only", function(){

            var cqParser = CalendarQueryParser.new(queries.eventsOnly);
            cqParser.parse();

            var filtered = events.filter(function(event){
                return validator.validate(event, cqParser.filters);
            });

            assert.equal(filtered.length, 3);

        })

    });





});