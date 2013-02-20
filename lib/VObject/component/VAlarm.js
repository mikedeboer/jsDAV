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
 * VAlarm component
 *
 * This component contains some additional functionality specific for VALARMs.
 */
var jsVObject_Component_VAlarm = module.exports = jsVObject_Component.extend({
    /**
     * Returns a DateTime object when this alarm is going to trigger.
     *
     * This ignores repeated alarm, only the first trigger is returned.
     *
     * @return DateTime
     */
    getEffectiveTriggerTime: function() {
        var trigger = this.TRIGGER;
        var effectiveTrigger;
        if (!trigger.VALUE || trigger.VALUE.toUpperCase() == "DURATION") {
            var triggerDuration = jsVObject_DateTimeParser.parseDuration(this.TRIGGER);
            var related = (trigger.RELATED && trigger.RELATED.toUpperCase() == "END") ? "END" : "START";

            var parentComponent = this.parent;
            if (related == "START") {
                var propName = (parentComponent.name == "VTODO")
                    ? "DUE"
                    : "DTSTART";

                effectiveTrigger = parentComponent[propName].getDateTime().clone();
                effectiveTrigger.add(triggerDuration);
            }
            else {
                var endProp;
                if (parentComponent.name == "VTODO")
                    endProp = "DUE";
                else if (parentComponent.name == "VEVENT")
                    endProp = "DTEND";
                else
                    throw new Error("time-range filters on VALARM components are only supported when they are a child of VTODO or VEVENT");

                if (parentComponent.endProp) {
                    effectiveTrigger = parentComponent[endProp].getDateTime().clone();
                    effectiveTrigger.add(triggerDuration);
                }
                else if (parentComponent.DURATION) {
                    effectiveTrigger = parentComponent.DTSTART.getDateTime().clone();
                    var duration = jsVObject_DateTimeParser.parseDuration(parentComponent.DURATION);
                    effectiveTrigger.add(duration);
                    effectiveTrigger.add(triggerDuration);
                }
                else {
                    effectiveTrigger = parentComponent.DTSTART.getDateTime().clone();
                    effectiveTrigger.add(triggerDuration);
                }
            }
        }
        else
            effectiveTrigger = trigger.getDateTime();

        return effectiveTrigger;
    },

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
        var effectiveTrigger = this.getEffectiveTriggerTime();

        if (this.DURATION) {
            var duration = jsVObject_DateTimeParser.parseDuration(this.DURATION);
            var repeat = this.repeat.toString();
            if (!repeat)
                repeat = 1;

            // TODO translate php DateTime traverse to JS
            var period = [effectiveTrigger, duration, parseInt(repeat, 10)];

            for (period in occurrence) {

                if (start <= occurrence && end > occurrence) {
                    return true;
                }
            }
            return false;
        }
        else
            return (start <= effectiveTrigger && end > effectiveTrigger);
    }
});
