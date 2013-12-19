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
        var
            result = this._checkChildPresence(component, filter),
            requestedChild;

        if (result.stop) {
            return result.result;
        } else {
            requestedChild = result.child;
        }

        return continuator.call(this, requestedChild, filter);
    }
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
                return this._validateFilterSet(vObject, this._validateCompFilter, filter['comp-filters']) &&
                       this._validateFilterSet(vObject, this._validatePropFilter, filter['prop-filters']);
            } else {
                return false;
            }


        } else {
            return true;
        }


    },

    _validateFilterSet: function(vObject, validator, filters) {

        var i, l, filter;

        for(i = 0, l = filters.length; i < l; i++) {
            filter = filters[i];

            if (!validator.call(this, vObject, filter)) {
                return false;
            }
        }

        return true;

    },

    _anyChildMatches: function(component, validator, filter) {

        var children = component.getChildren(),
            child, i, l;

        for(i = 0, l = children.length; i < l; i++) {

            child = children[i];

            if (validator.call(this, child, filter)) {
                return true;
            }

        }

        return false;
    },

    _allChildMatches: function(component, validator, filter) {

        var children = component.getChildren(),
            child, i, l;

        for(i = 0, l = children.length; i < l; i++) {

            child = children[i];

            if (!validator.call(this, child, filter)) {
                return false;
            }

        }

        return true;
    },

    _checkChildPresence: function(vObject, filter) {
        var
            componentName = filter.name,
            isChildPresent = vObject.isset(componentName),
            negateChildPresence = filter['is-not-defined'],
            child = isChildPresent && vObject.get(componentName);

        return {
            child: child,
            stop: !(isChildPresent && !negateChildPresence),
            result: isChildPresent ^ negateChildPresence
        };
    },

    _validateTimeRangeOnComponent: function(component, timeRangeFilter) {

        if (timeRangeFilter) {

            if (!this._anyChildMatches(component, this._validateTimeRange, timeRangeFilter)) {
                return false;
            }

        }

        return true;
    },

    _validateCompFilter: mkCommonValidator(function(requestedChild, filter) {

        if (!this._validateTimeRangeOnComponent(requestedChild, filter['time-range'])) {
            return false;
        }

        return this._validateFilterSet(requestedChild, this._validateCompFilter, filter['comp-filters']) &&
               this._validateFilterSet(requestedChild, this._validatePropFilter, filter['prop-filters']);

    }),

    _validatePropFilter: mkCommonValidator(function(requestedChild, filter) {

        /**
         * The CALDAV:prop-filter XML element contains a CALDAV:time-range
         * XML element and the property value overlaps the specified time
         * range...
         */
        if (!this._validateTimeRange(requestedChild, filter['time-range'])) {
            return false;
        }

        /**
         * The CALDAV:prop-filter XML element contains a CALDAV:text-match
         * XML element and the property value matches it...
         */
        if (!this._validateTextMatch(requestedChild, filter['text-match'])) {
            return false;
        }

        /**
         * ... and all specified CALDAV:param-filter child XML elements
         * also match the targeted property;
         */
        return this._validateFilterSet(requestedChild, this._validateParamFilter, filter['param-filters']);

    }),

    _validateParamFilter: mkCommonValidator(function(requestedChild, filter) {

        return this._validateTextMatch(requestedChild, filter['text-match']);

    }),



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
    __validateCompFilters: function (parent, filters) {

        var isDefined, subComponent, filter, nextFilter = false, idx;

        for(var i = 0, l = filters.length; i < l; i++) {

            filter = filters[i];

            isDefined = parent.isset(filter.name);

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
                // If no any child components is matches time-range filter...
                if (!nextFilter) {
                    return false;
                }
            }

            // No time-range or it matches
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
                    this._validatePropFilters(subComponent, filter['prop-filters'])) {
                    // We had a match, so this filter succeed
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
    __validatePropFilters: function (parent, filters) {

        var subComponent, found = false;

        for(var i = 0, l = filters.length; i < l; i++) {

            var filter = filters[i];

            var isDefined = parent.isset(filter.name);

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
                    if (this._validateParamFilters(subComponent, filter['param-filters'])) {
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
    __validateParamFilters: function (/*VObject\Property*/parent, /*array*/filters) {

        var isDefined, filter, paramPart, found = false;

        for(var i = 0, l = filters.length; i < l; i++) {

            filter = filters[i];

            isDefined = parent.name == filter.name;

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

            if (this._validateTextMatch(parent.value, filter['text-match'])) {
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
     * @param {jsVObject_Node|String} component Value to check against.
     * @param {Object} textMatch
     * @return bool
     */
    _validateTextMatch: function (component, textMatch) {

        if (component.hasFeature && component.hasFeature(jsVObject_Node)) {
            component = component.getValue();
        }

        var isMatching = Util.textMatch(component, textMatch.value, textMatch['match-type']);

        return (textMatch['negate-condition'] ^ isMatching);

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

        if (!filter) {
            return true;
        }


        var start = filter.start, end = filter.end;

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