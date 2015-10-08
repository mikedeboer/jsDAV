/*
 * @package jsDAV
 * @subpackage CalDAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Oleg Elifantiev <oleg@elifantiev.ru>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

"use strict";

var Base = require("./../shared/base");
var Exc = require("./../shared/exceptions");
var Util = require("./../shared/util");
var jsVObject_Node = require("./../VObject/node");

/**
 *
 * @param {Function} continuator
 * @returns {Function}
 */
function mkCommonValidator(continuator) {
    return function(component, filter) {
        /**
         *  The CALDAV:prop-filter XML element is empty and a property of
         * the type specified by the "name" attribute exists in the
         * enclosing calendar component;
         *
         * or:
         *
         *  The CALDAV:prop-filter XML element contains a CALDAV:is-not-
         * defined XML element and no property of the type specified by
         * the "name" attribute exists in the enclosing calendar
         * component;
         */
        var result = this._checkChildPresence(component, filter);

        if (result.stop)
            return result.result;

        return continuator.call(this, result.children, filter);
    };
}


var jsDAV_CalendarQueryValidator = module.exports = Base.extend({
    /**
     * Verify if a list of filters applies to the calendar data object
     *
     * The list of filters must be formatted as parsed by \Sabre\CalDAV\CalendarQueryParser
     *
     * @param {jsVObject_Component} vObject
     * @param {Array} filter
     * @return bool
     */
    validate: function (vObject, filter) {
        /**
         * Definition:
         *   <!ELEMENT filter (comp-filter)>
         */
        if (filter) {
            if (vObject.name == filter.name) {
                return this._validateFilterSet(vObject, filter["comp-filters"], this._validateCompFilter) &&
                       this._validateFilterSet(vObject, filter["prop-filters"], this._validatePropFilter);
            }
            else
                return false;
        }
        else
            return true;


    },

    _validateFilterSet: function(vObject, filters, validator) {
        for (var filter, i = 0, l = filters.length; i < l; i++) {
            filter = filters[i];
            if (!validator.call(this, vObject, filter))
                return false;
        }

        return true;
    },

    _anyChildMatches: function(children, filter, validator) {
        for(var child, i = 0, l = children.length; i < l; i++) {
            child = children[i];
            if (validator.call(this, child, filter))
                return true;
        }

        return false;
    },

    _allChildMatches: function(children, validator, filter) {
        for(var child, i = 0, l = children.length; i < l; i++) {
            child = children[i];
            if (!validator.call(this, child, filter))
                return false;
        }

        return true;
    },

    _checkChildPresence: function(vObject, filter) {
        var componentName = filter.name;
        var isChildPresent = vObject.isset(componentName);
        var negateChildPresence = filter["is-not-defined"];
        var children = isChildPresent && vObject.select(componentName);

        return {
            children: children,
            stop: !(isChildPresent && !negateChildPresence),
            result: isChildPresent ^ negateChildPresence
        };
    },

    _validateTimeRangeOnComponent: function(component, timeRangeFilter) {
        if (timeRangeFilter) {
            if (!this._anyChildMatches(component.getChildren(), timeRangeFilter, this._validateTimeRange))
                return false;
        }

        return true;
    },

    _validateCompFilter: mkCommonValidator(function(children, filter) {
        var childrenMatchesRange;

        childrenMatchesRange = children.filter(function(child){
            return this._validateTimeRangeOnComponent(child, filter["time-range"]);
        }, this);

        if (childrenMatchesRange.length === 0)
            return false;

        return childrenMatchesRange.some(function(child){
            return this._validateFilterSet(child, filter["comp-filters"], this._validateCompFilter) &&
                   this._validateFilterSet(child, filter["prop-filters"], this._validatePropFilter);
        }, this);
    }),

    _validatePropFilter: mkCommonValidator(function(children, filter) {
        return this._anyChildMatches(children, filter, function(child, filter) {
            if (!this._validateTimeRange(child, filter["time-range"]))
                return false;

            if (!this._validateTextMatch(child, filter["text-match"]))
                return false;

            return this._validateFilterSet(child, filter["param-filters"], this._validateParamFilter);
        });

    }),

    _validateParamFilter: mkCommonValidator(function(children, filter) {
        return this._validateTextMatch(children[0], filter["text-match"]);
    }),

    /**
     * This method checks the validity of a text-match.
     *
     * A single text-match should be specified as well as the specific property
     * or parameter we need to validate.
     *
     * @param {jsVObject_Node|String} component Value to check against.
     * @param {Object} textMatch
     * @return bool
     */
    _validateTextMatch: function (component, textMatch) {
        if (component.hasFeature && component.hasFeature(jsVObject_Node))
            component = component.getValue();

        var isMatching = Util.textMatch(component, textMatch.value, textMatch["match-type"]);
        return (textMatch["negate-condition"] ^ isMatching);
    },

    /**
     * Validates if a component matches the given time range.
     *
     * This is all based on the rules specified in rfc4791, which are quite
     * complex.
     *
     * @param {jsVObject_Node} component
     * @param {Object} [filter]
     * @param {Date} [filter.start]
     * @param {Date} [filter.end]
     * @return bool
     */
    _validateTimeRange: function (component, filter) {
        if (!filter)
            return true;

        var start = filter.start, end = filter.end;

        if (!start)
            start = new Date(1900, 1, 1);
        if (!end)
            end = new Date(3000, 1, 1);

        switch (component.name) {
            case "VEVENT" :
            case "VTODO" :
            case "VJOURNAL" :
                return component.isInTimeRange(start, end);
            case "VALARM" :
                /*
                // If the valarm is wrapped in a recurring event, we need to
                // expand the recursions, and validate each.
                //
                // Our datamodel doesn't easily allow us to do this straight
                // in the VALARM component code, so this is a hack, and an
                // expensive one too.
                if (component.parent.name === 'VEVENT' && component.parent.RRULE) {

                    // Fire up the iterator!
                    it = new VObject\RecurrenceIterator(component.parent.parent, (string)
                    component.parent.UID
                )
                    ;
                    while (it.valid()) {
                        expandedEvent = it.getEventObject();

                        // We need to check from these expanded alarms, which
                        // one is the first to trigger. Based on this, we can
                        // determine if we can 'give up' expanding events.
                        firstAlarm = null;
                        if (expandedEvent.VALARM !== null) {
                            foreach(expandedEvent.VALARM
                            as
                            expandedAlarm
                        )
                            {

                                effectiveTrigger = expandedAlarm.getEffectiveTriggerTime();
                                if (expandedAlarm.isInTimeRange(start, end)) {
                                    return true;
                                }

                                if ((string)expandedAlarm.TRIGGER['VALUE'] === 'DATE-TIME'
                            )
                                {
                                    // This is an alarm with a non-relative trigger
                                    // time, likely created by a buggy client. The
                                    // implication is that every alarm in this
                                    // recurring event trigger at the exact same
                                    // time. It doesn't make sense to traverse
                                    // further.
                                }
                            else
                                {
                                    // We store the first alarm as a means to
                                    // figure out when we can stop traversing.
                                    if (!firstAlarm || effectiveTrigger < firstAlarm) {
                                        firstAlarm = effectiveTrigger;
                                    }
                                }
                            }
                        }
                        if (is_null(firstAlarm)) {
                            // No alarm was found.
                            //
                            // Or technically: No alarm that will change for
                            // every instance of the recurrence was found,
                            // which means we can assume there was no match.
                            return false;
                        }
                        if (firstAlarm > end) {
                            return false;
                        }
                        it.next();
                    }
                    return false;
                } else {
                    return component.isInTimeRange(start, end);
                }
                */
            case "VFREEBUSY" :
                 throw new Exc.NotImplemented("time-range filters are currently not supported on " + component.name + " components");
            case "COMPLETED" :
            case "CREATED" :
            case "DTEND" :
            case "DTSTAMP" :
            case "DTSTART" :
            case "DUE" :
            case "LAST-MODIFIED" :
                return (start <= component.getDateTime() && end >= component.getDateTime());
            default :
                // throw new Exc.BadRequest("You cannot create a time-range filter on a " + component.name + " component");
                return false;
        }
    }
});
