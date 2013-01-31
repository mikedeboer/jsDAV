/*
 * @package jsDAV
 * @subpackage VObject
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsVObject_Component = require("./../component");
var jsVObject_Property_DateTime = require("./../property/dateTime");

/**
 * VJournal component
 *
 * This component contains some additional functionality specific for VJOURNALs.
 */
var jsVObject_Component_VJournal = module.exports = jsVObject_Component.extend({
    /**
     * Returns true or false depending on if the event falls in the specified 
     * time-range. This is used for filtering purposes. 
     *
     * The rules used to determine if an event falls within the specified 
     * time-range is based on the CalDAV specification.
     *
     * @param start
     * @param end 
     * @return bool 
     */
    isInTimeRange: function(start, end) {
        var dtstart = this.DTSTART ? this.DTSTART.getDateTime() : null;
        if (dtstart) {
            var effectiveEnd = dtstart.clone();
            if (this.DTSTART.getDateType() == jsVObject_Property_DateTime.DATE)
                effectiveEnd.modify("+1 day");

            return (start <= effectiveEnd && end > dtstart);
        }
        return false;
    }
});
