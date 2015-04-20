/*
 * @package jsDAV
 * @subpackage CardDAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_iCollection = require("./../../DAV/interfaces/iCollection");
var Exc = require("./../../shared/exceptions");

/**
 * Calendar interface
 *
 * Implement this interface to allow a node to be recognized as a Calendar
 */
var jsCalDAV_iCalendar = module.exports = jsDAV_iCollection.extend({
    /**
     * Performs a calendar-query on the contents of this calendar.
     *
     * The calendar-query is defined in RFC4791 : CalDAV. Using the
     * calendar-query it is possible for a client to request a specific set of
     * object, based on contents of iCalendar properties, date-ranges and
     * iCalendar component types (VTODO, VEVENT).
     *
     * This method should just return a list of (relative) urls that match this
     * query.
     *
     * The list of filters are specified as an array. The exact array is
     * documented by jsCalDAV_CalendarQueryParser.
     *
     * @param {Array} filters
     * @return array
     */
    calendarQuery: function(filters, callback) {
        callback(Exc.notImplementedYet("iCalendar.calendarQuery is not implemented"));
    }
});
