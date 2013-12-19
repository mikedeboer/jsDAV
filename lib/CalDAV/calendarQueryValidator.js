/*
 * @package jsDAV
 * @subpackage CalDAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Oleg Elifantiev <oleg@elifantiev.ru>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */


'use strict';

var Base = require('./../shared/base');
var Exc = require("./../shared/exceptions");
var Util = require("./../shared/util");
var jsVObject_Node = require('./../VObject/node');

var jsDAV_CalendarQueryValidator = module.exports = Base.extend({

    /**
     * Verify if a list of filters applies to the calendar data object
     *
     * The list of filters must be formatted as parsed by \Sabre\CalDAV\CalendarQueryParser
     *
     * @param {jsVObject_Component} vObject
     * @param {Array} filters
     * @return bool
     */
    validate: function (/*{jsVObject_Component}\VCalendar*/vObject, /*array*/filters) {

        // The top level object is always a component filter.
        // We'll parse it manually, as it's pretty simple.
        if (vObject.name !== filters.name) {
            return false;
        }

        return this._validateCompFilters(vObject, filters['comp-filters']) &&
            this._validatePropFilters(vObject, filters['prop-filters']);


    },

    /**
     * This method checks the validity of comp-filters.
     *
     * A list of comp-filters needs to be specified. Also the parent of the
     * component we're checking should be specified, not the component to check
     * itself.
     *
     * @param {jsVObject_Component} parent
     * @param {Array} filters
     * @return bool
     */
    _validateCompFilters: function (/*{jsVObject_Component}*/parent, /*array*/filters) {

        var isDefined, subComponent, filter, nextFilter = false, idx;

        for(var i = 0, l = filters.length; i < l; i++) {

            filter = filters[i];

            isDefined = parent.isset(filter['name']);

            if (filter['is-not-defined']) {

                if (isDefined) {
                    return false;
                } else {
                    continue;
                }

            }

            if (!isDefined) {
                return false;
            }

            if (filter['time-range']) {
                nextFilter = false;
                var subComponents = parent.get(filter['name']).getChildren();
                for(var j = 0, lj = subComponents.length; j < lj; j++) {
                    subComponent = subComponents[j];
                    if (this._validateTimeRange(subComponent, filter['time-range']['start'], filter['time-range']['end'])) {
                        nextFilter = true;
                        break;
                    }
                }
                if (nextFilter) {
                    continue;
                }
                return false;
            }

            if (!filter['comp-filters'] && !filter['prop-filters']) {
                continue;
            }

            // If there are sub-filters, we need to find at least one component
            // for which the subfilters hold true.
            nextFilter = false;
            var currentObject = parent.get(filter['name']);
            subComponents = currentObject.getChildren();
            for(j = 0, lj = subComponents.length; j < lj; j++) {
                subComponent = subComponents[j];
                if (this._validateCompFilters(subComponent, filter['comp-filters']) &&
                    this._validatePropFilters(currentObject, filter['prop-filters'])) {
                    // We had a match, so this comp-filter succeeds
                    nextFilter = true;
                    break;
                }
            }

            if (nextFilter) {
                continue;
            }

            // If we got here it means there were sub-comp-filters or
            // sub-prop-filters and there was no match. This means this filter
            // needs to return false.
            return false;

        }

        // If we got here it means we got through all comp-filters alive so the
        // filters were all true.
        return true;

    },

    /**
     * This method checks the validity of prop-filters.
     *
     * A list of prop-filters needs to be specified. Also the parent of the
     * property we're checking should be specified, not the property to check
     * itself.
     *
     * @param {jsVObject_Component} parent
     * @param {Array} filters
     * @return bool
     */
    _validatePropFilters: function (/*{jsVObject_Component}*/parent, /*array*/filters) {

        var subComponent, found = false;

        for(var i = 0, l = filters.length; i < l; i++) {

            var filter = filters[i];

            var isDefined = parent.isset(filter['name']);

            if (filter['is-not-defined']) {

                if (isDefined) {
                    return false;
                } else {
                    continue;
                }

            }

            if (!isDefined) {
                return false;
            }

            if (filter['time-range']) {
                found = false;
                var subComponents = parent.get(filter['name']).getChildren();
                for(var j = 0, lj = subComponents.length; j < lj; j++) {
                    subComponent = subComponents[j];
                    if (this._validateTimeRange(subComponent, filter['time-range']['start'], filter['time-range']['end'])) {
                        found = true;
                        break;
                    }
                }
                if (found) {
                    continue;
                }
                return false;
            }

            if (!filter['param-filters'] && !filter['text-match']) {
                continue;
            }

            var currentElement = parent.get(filter['name']);

            // If there are sub-filters, we need to find at least one property
            // for which the subfilters hold true.
            if(filter['param-filters'] && filter['param-filters'].length) {
                found = false;
                subComponents = currentElement.getChildren();
                for(j = 0, lj = subComponents.length; j < lj; j++) {
                    subComponent = subComponents[j];
                    if (this.validateParamFilters(subComponent, filter['param-filters'])) {
                        // Found a parameter which match a search criteria
                        found = true;
                        break;
                    }
                }
            } else {
                found = true;
            }

            // Now check text-match filter
            if(filter['text-match']) {
                found &= this._validateTextMatch(currentElement, filter['text-match']);
            }

            if (found) {
                continue;
            }

            // If we got here it means there were sub-param-filters or
            // text-match filters and there was no match. This means the
            // filter needs to return false.
            return false;

        }

        // If we got here it means we got through all prop-filters alive so the
        // filters were all true.
        return true;

    },

    /**
     * This method checks the validity of param-filters.
     *
     * A list of param-filters needs to be specified. Also the parent of the
     * parameter we're checking should be specified, not the parameter to check
     * itself.
     *
     * @param {jsVObject_Component} parent
     * @param {Array} filters
     * @return bool
     */
    _validateParamFilters: function (/*VObject\Property*/parent, /*array*/filters) {

        var isDefined, filter, paramPart, found = false;

        for(var i = 0, l = filters.length; i < l; i++) {

            filter = filters[i];

            isDefined = parent.isset(filter['name']);

            if (filter['is-not-defined']) {

                if (isDefined) {
                    return false;
                } else {
                    continue;
                }

            }
            if (!isDefined) {
                return false;
            }

            if (!filter['text-match']) {
                continue;
            }

            // If there are sub-filters, we need to find at least one parameter
            // for which the subfilters hold true.
            found = false;
            var parts = parent.get(filter.name).getParts();
            for(var j = 0, lj = parts.length; j < lj; j++) {
                paramPart = parts[j];
                if (this._validateTextMatch(paramPart, filter['text-match'])) {
                    // We had a match, so this param-filter succeeds
                    found = true;
                }

            }

            if (found) {
                continue;
            }

            // If we got here it means there was a text-match filter and there
            // were no matches. This means the filter needs to return false.
            return false;

        }

        // If we got here it means we got through all param-filters alive so the
        // filters were all true.
        return true;

    },

    /**
     * This method checks the validity of a text-match.
     *
     * A single text-match should be specified as well as the specific property
     * or parameter we need to validate.
     *
     * @param {jsVObject_Node|String} check Value to check against.
     * @param {Object} textMatch
     * @return bool
     */
    _validateTextMatch: function (check, textMatch) {

        if (check.hasFeature && check.hasFeature(jsVObject_Node)) {
            check = check.getValue();
        }

        var isMatching = Util.textMatch(check, textMatch.value, textMatch['match-type']);

        return (textMatch['negate-condition'] ^ isMatching);

    },

    /**
     * Validates if a component matches the given time range.
     *
     * This is all based on the rules specified in rfc4791, which are quite
     * complex.
     *
     * @param {jsVObject_Node} component
     * @param {Date} start
     * @param {Date} end
     * @return bool
     */
    _validateTimeRange: function (/*VObject\Node*/component, start, end) {

        if (!start) {
            start = new Date(1900, 1, 1);
        }
        if (!end) {
            end = new Date(3000, 1, 1);
        }

        switch (component.name) {

            case 'VEVENT' :
            case 'VTODO' :
            case 'VJOURNAL' :

                return component.isInTimeRange(start, end);

            case 'VALARM' :
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
            case 'VFREEBUSY' :
                 throw Exc.NotImplemented('time-range filters are currently not supported on ' + component.name + ' components');

            case 'COMPLETED' :
            case 'CREATED' :
            case 'DTEND' :
            case 'DTSTAMP' :
            case 'DTSTART' :
            case 'DUE' :
            case 'LAST-MODIFIED' :
                return (start <= component.getDateTime() && end >= component.getDateTime());

            default :
                throw Exc.BadRequest('You cannot create a time-range filter on a ' + component.name + ' component');

        }

    }

});