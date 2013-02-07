/*
 * @package jsDAV
 * @subpackage VObject
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsVObject_Component = require("./../component");
var jsVObject_RecurrenceIterator = require("./../recurrenceIterator");
var jsVObject_DateTimeParser = require("./../dateTimeParser");
var jsVObject_Property_DateTime = require("./../property/dateTime");

/**
 * VEvent component
 *
 * This component contains some additional functionality specific for VEVENT's.
 */
var jsVObject_Component_VEvent = module.exports = jsVObject_Component.extend({
    /**
     * Returns true or false depending on if the event falls in the specified
     * time-range. This is used for filtering purposes.
     *
     * The rules used to determine if an event falls within the specified
     * time-range is based on the CalDAV specification.
     *
     * @param Date start
     * @param Date end
     * @return bool
     */
    isInTimeRange: function(start, end) {
        if (this.RRULE) {
            var it = jsVObject_RecurrenceIterator.new(this);
            it.fastForward(start);

            // We fast-forwarded to a spot where the end-time of the
            // recurrence instance exceeded the start of the requested
            // time-range.
            //
            // If the starttime of the recurrence did not exceed the
            // end of the time range as well, we have a match.
            return (it.getDTStart() < end && it.getDTEnd() > start);
        }

        var effectiveStart = this.DTSTART.getDateTime();
        var effectiveEnd;
        if (this.DTEND) {
            // The DTEND property is considered non inclusive. So for a 3 day
            // event in july, dtstart and dtend would have to be July 1st and
            // July 4th respectively.
            //
            // See:
            // http://tools.ietf.org/html/rfc5545#page-54
            effectiveEnd = this.DTEND.getDateTime();
        }
        else if (this.DURATION) {
            effectiveEnd = effectiveStart.clone();
            effectiveEnd.add(jsVObject_DateTimeParser.parseDuration(this.DURATION));
        }
        else if (this.DTSTART.getDateType() == jsVObject_Property_DateTime.DATE) {
            effectiveEnd = effectiveStart.clone();
            effectiveEnd.modify("+1 day");
        }
        else {
            effectiveEnd = effectiveStart.clone();
        }
        return (
            (start <= effectiveEnd) && (end > effectiveStart)
        );
    }
});
