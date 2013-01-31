/*
 * @package jsDAV
 * @subpackage VObject
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsVObject_Component = require("./../component");
var jsVObject_DateTimeParser = require("./../dateTimeParser");

/**
 * VTodo component
 *
 * This component contains some additional functionality specific for VTODOs.
 */
var jsVObject_Component_VTodo = module.exports = jsVObject_Component.extend({
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
        var dtstart = this.DTSTART ? this.DTSTART.getDateTime() : null;
        var duration = this.DURATION ? jsVObject_DateTimeParser.parseDuration(this.DURATION) : null;
        var due = this.DUE ? this.DUE.getDateTime() : null;
        var completed = this.COMPLETED ? this.COMPLETED.getDateTime() : null;
        var created = this.CREATED ? this.CREATED.getDateTime() : null;

        if (dtstart) {
            if (duration) {
                var effectiveEnd = dtstart.clone();
                effectiveEnd.add(duration);
                return start <= effectiveEnd && end > dtstart;
            }
            else if (due) {
                return (start < due || start <= dtstart) &&
                       (end > dtstart || end >= due);
            }
            else {
                return start <= dtstart && end > dtstart;
            }
        }
        if (due) {
            return (start < due && end >= due);
        }
        if (completed && created) {
            return (start <= created || start <= completed) &&
                   (end >= created || end >= completed);
        }
        if (completed)
            return (start <= completed && end >= completed);
            
        if (created)
            return (end > created);
            
        return true;
    }
});
