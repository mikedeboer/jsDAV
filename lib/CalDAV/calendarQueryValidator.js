/**
 * CalendarQuery Validator
 *
 * This class is responsible for checking if an iCalendar object matches a set
 * of filters. The main function to do this is 'validate'.
 *
 * This is used to determine which icalendar objects should be returned for a
 * calendar-query REPORT request.
 *
 * @package jsDAV
 * @subpackage CalDAV
 * @copyright Copyright(c) 2011 Tri Tech Computers Ltd. <info AT tri-tech DOT com>
 * @copyright Copyright (C) 2007-2011 Rooftop Solutions. All rights reserved.
 * @author Evert Pot (http://www.rooftopsolutions.nl/)
 * @author James Emerton <james AT tri-tech DOT com>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */


var Exc = require('../DAV/exceptions');


function jsDAV_CalDAV_CalendarQueryValidator() {
}

(function() {
    /**
     * Verify if a list of filters applies to the calendar data object
     *
     * The list of filters must be formatted as parsed by Sabre_CalDAV_CalendarQueryParser
     *
     * @param Sabre_VObject_Component $vObject
     * @param array $filters
     * @return bool
     */
    this.validate = function(vObject, filters) {
        // The top level object is always a component filter.
        // We'll parse it manually, as it's pretty simple.
        if (vObject.element !== filters['name'])
            return false;

        return this.validateCompFilters(vObject, filters['comp-filters'])
            && this.validatePropFilters(vObject, filters['prop-filters']);
    }

    /**
     * This method checks the validity of comp-filters.
     *
     * A list of comp-filters needs to be specified. Also the parent of the
     * component we're checking should be specified, not the component to check
     * itself.
     *
     * @param Sabre_VObject_Component $parent
     * @param array $filters
     * @return bool
     */
    this.validateCompFilters = function(vobject, filters) {
        for(var i=0; i<filters.length; ++i) {
            var filter = filters[i];

            var sub_components = vobject.getComponents(filter.name);

            if(filter['is-not-defined']) {
                if(sub_components.length > 0)
                    return false;
                else
                    continue;
            }
            else if(!sub_components.length)
                return false;

            if(filter['time-range']) {
                var time_range_ok = false;
                for(var i=0; i<sub_components.length; ++i) {
                    var sub_component = sub_components[i];
                    if(this.validateTimeRange(sub_component, filter['time-range'].start, filter['time-range'].end)) {
                        time_range_ok = true;
                        break;
                    }
                }

                if(!time_range_ok)
                    return false;
            }

            if((filter['comp-filters'] && filter['comp-filters'].length)
                    || (filter['prop-filters'] && filter['prop-filters'].length)) {
                var subfilters_ok = false;

                // If there are sub-filters, we need to find at least one component
                // for which the subfilters hold true.
                for(var i=0; i<sub_components.length; ++i) {
                    var sub_component = sub_components[i];
                    if(this.validateCompFilters(sub_component, filter['comp-filters'])
                            && this.validatePropFilters(sub_component, filters['prop-filters']))
                        subfilters_ok = true;
                        break;

                }

                if(!subfilters_ok)
                    return false;
            }
        }

        // If we got here it means we got through all comp-filters alive so the
        // filters were all true.
        return true;
    }

    /**
     * This method checks the validity of prop-filters.
     *
     * A list of prop-filters needs to be specified. Also the parent of the
     * property we're checking should be specified, not the property to check
     * itself.
     *
     * @param Sabre_VObject_Component $parent
     * @param array $filters
     * @return bool
     */
    this.validatePropFilters = function(vobject, filters) {
        if(!filters || !filters.length)
            return true;
    
        throw new Exc.jsDAV_Exception_NotImplemented('prop-filters are not currently supported');
//
//        foreach($filters as $filter) {
//
//            $isDefined = isset($parent->$filter['name']);
//
//            if ($filter['is-not-defined']) {
//
//                if ($isDefined) {
//                    return false;
//                } else {
//                    continue;
//                }
//
//            }
//            if (!$isDefined) {
//                return false;
//            }
//
//            if ($filter['time-range']) {
//                foreach($parent->$filter['name'] as $subComponent) {
//                    if ($this->validateTimeRange($subComponent, $filter['time-range']['start'], $filter['time-range']['end'])) {
//                        continue 2;
//                    }
//                }
//                return false;
//            }
//
//            if (!$filter['param-filters'] && !$filter['text-match']) {
//                continue;
//            }
//
//            // If there are sub-filters, we need to find at least one property
//            // for which the subfilters hold true.
//            foreach($parent->$filter['name'] as $subComponent) {
//
//                if(
//                    $this->validateParamFilters($subComponent, $filter['param-filters']) &&
//                    (!$filter['text-match'] || $this->validateTextMatch($subComponent, $filter['text-match']))
//                ) {
//                    // We had a match, so this prop-filter succeeds
//                    continue 2;
//                }
//
//            }
//
//            // If we got here it means there were sub-param-filters or
//            // text-match filters and there was no match. This means the
//            // filter needs to return false.
//            return false;
//
//        }
//
//        // If we got here it means we got through all prop-filters alive so the
//        // filters were all true.
//        return true;
//
    }
//
//    /**
//     * This method checks the validity of param-filters.
//     *
//     * A list of param-filters needs to be specified. Also the parent of the
//     * parameter we're checking should be specified, not the parameter to check
//     * itself.
//     *
//     * @param Sabre_VObject_Property $parent
//     * @param array $filters
//     * @return bool
//     */
//    protected function validateParamFilters(Sabre_VObject_Property $parent, array $filters) {
//
//        foreach($filters as $filter) {
//
//            $isDefined = isset($parent[$filter['name']]);
//
//            if ($filter['is-not-defined']) {
//
//                if ($isDefined) {
//                    return false;
//                } else {
//                    continue;
//                }
//
//            }
//            if (!$isDefined) {
//                return false;
//            }
//
//            if (!$filter['text-match']) {
//                continue;
//            }
//
//            // If there are sub-filters, we need to find at least one parameter
//            // for which the subfilters hold true.
//            foreach($parent[$filter['name']] as $subParam) {
//
//                if($this->validateTextMatch($subParam,$filter['text-match'])) {
//                    // We had a match, so this param-filter succeeds
//                    continue 2;
//                }
//
//            }
//
//            // If we got here it means there was a text-match filter and there
//            // were no matches. This means the filter needs to return false.
//            return false;
//
//        }
//
//        // If we got here it means we got through all param-filters alive so the
//        // filters were all true.
//        return true;
//
//    }
//
//    /**
//     * This method checks the validity of a text-match.
//     *
//     * A single text-match should be specified as well as the specific property
//     * or parameter we need to validate.
//     *
//     * @param Sabre_VObject_Node $parent
//     * @param array $textMatch
//     * @return bool
//     */
//    protected function validateTextMatch(Sabre_VObject_Node $parent, array $textMatch) {
//
//        $value = (string)$parent;
//
//        $isMatching = Sabre_DAV_StringUtil::textMatch($value, $textMatch['value'], $textMatch['collation']);
//
//        return ($textMatch['negate-condition'] xor $isMatching);
//
//    }

    /**
     * Validates if a component matches the given time range.
     *
     * This is all based on the rules specified in rfc4791, which are quite
     * complex.
     *
     * @param Sabre_VObject_Node $component
     * @param DateTime $start
     * @param DateTime $end
     * @return bool
     */
    this.validateTimeRange = function(component, start, end) {
        switch(component.element) {
            case 'VEVENT' :
            case 'VTODO' :
            case 'VJOURNAL' :
                return component.inTimeRange(start, end);

            case 'VFREEBUSY' :
            case 'VALARM' :
                throw new Exc.jsDAV_Exception_NotImplemented('time-range filters are currently not supported on '
                            +component.element+' components');

//            case 'VALARM' :
//                $trigger = $component->TRIGGER;
//                if(!isset($trigger['TYPE']) || strtoupper($trigger['TYPE']) === 'DURATION') {
//                    $triggerDuration = Sabre_VObject_DateTimeParser::parseDuration($component->TRIGGER);
//                    $related = (isset($trigger['RELATED']) && strtoupper($trigger['RELATED']) == 'END') ? 'END' : 'START';
//
//                    $parentComponent = $component->parent;
//                    if ($related === 'START') {
//                        $effectiveTrigger = clone $parentComponent->DTSTART->getDateTime();
//                        $effectiveTrigger->add($triggerDuration);
//                    } else {
//                        if ($parentComponent->element === 'VTODO') {
//                            $endProp = 'DUE';
//                        } elseif ($parentComponent->element === 'VEVENT') {
//                            $endProp = 'DTEND';
//                        } else {
//                            throw new Sabre_DAV_Exception('time-range filters on VALARM components are only supported when they are a child of VTODO or VEVENT');
//                        }
//
//                        if (isset($parentComponent->$endProp)) {
//                            $effectiveTrigger = clone $parentComponent->$endProp->getDateTime();
//                            $effectiveTrigger->add($triggerDuration);
//                        } elseif (isset($parentComponent->DURATION)) {
//                            $effectiveTrigger = clone $parentComponent->DTSTART->getDateTime();
//                            $duration = Sabre_VObject_DateTimeParser::parseDuration($parentComponent->DURATION);
//                            $effectiveTrigger->add($duration);
//                            $effectiveTrigger->add($triggerDuration);
//                        } else {
//                            $effectiveTrigger = clone $parentComponent->DTSTART->getDateTime();
//                            $effectiveTrigger->add($triggerDuration);
//                        }
//                    }
//                } else {
//                    $effectiveTrigger = $trigger->getDateTime();
//                }
//
//                if (isset($component->DURATION)) {
//                    $duration = Sabre_VObject_DateTimeParser::parseDuration($component->DURATION);
//                    $repeat = (string)$component->repeat;
//                    if (!$repeat) {
//                        $repeat = 1;
//                    }
//
//                    $period = new DatePeriod($effectiveTrigger, $duration, (int)$repeat);
//
//                    foreach($period as $occurrence) {
//
//                        if ($start <= $occurrence && $end > $occurrence) {
//                            return true;
//                        }
//                    }
//                    return false;
//                } else {
//                    return ($start <= $effectiveTrigger && $end > $effectiveTrigger);
//                }
//                break;

//            case 'COMPLETED' :
//            case 'CREATED' :
//            case 'DTEND' :
//            case 'DTSTAMP' :
//            case 'DTSTART' :
//            case 'DUE' :
//            case 'LAST-MODIFIED' :
//                return ($start <= $component->getDateTime() && $end >= $component->getDateTime());

            default:
                throw new Exc.jsDAV_Exception_BadRequest('You cannot create a time-range filter on a '
                        +component.element+' component');

        }

    }

}).call(jsDAV_CalDAV_CalendarQueryValidator.prototype);

exports.jsDAV_CalDAV_CalendarQueryValidator = jsDAV_CalDAV_CalendarQueryValidator;
