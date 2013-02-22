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
var jsVObject_Property_DateTime = require("./../property/dateTime");

/**
 * The VCalendar component
 *
 * This component adds functionality to a component, specific for a VCALENDAR.
 */
var jsVObject_Component_VCalendar = module.exports = jsVObject_Component.extend({
    /**
     * Returns a list of all 'base components'. For instance, if an Event has 
     * a recurrence rule, and one instance is overridden, the overridden event 
     * will have the same UID, but will be excluded from this list.
     *
     * VTIMEZONE components will always be excluded. 
     *
     * @param {String} componentName filter by component name 
     * @return array 
     */
    getBaseComponents: function(componentName) {
        componentName = componentName || null;
        var components = [];
        this.children.forEach(function(component) {
            if (!component.hasFeature(jsVObject_Component))
                return;

            if (component["RECURRENCE-ID"]) 
                return;

            if (componentName && component.name != componentName.toUpperCase()) 
                return;

            if (component.name == "VTIMEZONE")
                return;

            components.push(component);
        });

        return components;
    },

    /**
     * If this calendar object, has events with recurrence rules, this method 
     * can be used to expand the event into multiple sub-events.
     *
     * Each event will be stripped from it's recurrence information, and only 
     * the instances of the event in the specified timerange will be left 
     * alone.
     *
     * In addition, this method will cause timezone information to be stripped, 
     * and normalized to UTC.
     *
     * This method will alter the VCalendar. This cannot be reversed.
     *
     * This functionality is specifically used by the CalDAV standard. It is 
     * possible for clients to request expand events, if they are rather simple 
     * clients and do not have the possibility to calculate recurrences.
     *
     * @param Date start
     * @param Date end 
     * @return void
     */
    expand: function(start, end) {
        var newEvents = []

        var self = this;
        this.select("VEVENT").forEach(function(vevent, key) {
            if (vevent["RECURRENCE-ID"]) {
                self.children.splice(key, 1);
                return;
            }

            if (!vevent.rrule) {
                self.children.splice(key, 1);
                if (vevent.isInTimeRange(start, end))
                    newEvents.push(vevent);
                return;
            }

            var uid = vevent.uid.toString();
            if (!uid)
                throw new Error("Event did not have a UID!");

            var it = jsVObject_RecurrenceIterator.new(self, vevent.uid);
            it.fastForward(start);

            while (it.valid() && it.getDTStart() < end) {
                if (it.getDTEnd() > start)
                    newEvents.push(it.getEventObject());
                it.next();
            }
            self.children.splice(key, 1);
        });

        newEvents.forEach(function(newEvent) {
            newEvent.children.forEach(function(child) {
                if (child instanceof jsVObject_Property_DateTime &&
                    child.getDateType() == jsVObject_Property_DateTime.LOCALTZ) {
                        child.setDateTime(child.getDateTime(), jsVObject_Property_DateTime.UTC);
                    }
            });
            self.add(newEvent);
        });

        // Removing all VTIMEZONE components
        delete this.VTIMEZONE;
    },

    /*
     * Validates the node for correctness.
     * An array is returned with warnings.
     *
     * Every item in the array has the following properties:
     *    * level - (number between 1 and 3 with severity information)
     *    * message - (human readable message)
     *    * node - (reference to the offending node)
     * 
     * @return array 
     *
    validate: function() {
        var warnings = [];

        version = this.select("VERSION");
        if (version.length !== 1) {
            warnings.push({
                "level": 1,
                "message": "The VERSION property must appear in the VCALENDAR component exactly 1 time",
                "node": this
            });
        }
        else {
            if (this.VERSION.toString() != "2.0") {
                warnings.push({
                    "level": 1,
                    "message": "Only iCalendar version 2.0 as defined in rfc5545 is supported.",
                    "node": this
                });
            }
        } 
        var version = this.select("PRODID");
        if (version.length !== 1) {
            warnings.push({
                "level": 2,
                "message": "The PRODID property must appear in the VCALENDAR component exactly 1 time",
                "node": this
            });
        }
        if (this.CALSCALE.length > 1) {
            warnings.push({
                "level": 2,
                "message": "The CALSCALE property must not be specified more than once.",
                "node": this
            );
        }
        if (this.METHOD.length > 1) {
            warnings.push({
                "level": 2,
                "message": "The METHOD property must not be specified more than once.",
                "node": this,
            });
        }

        var allowedComponents = [
            "VEVENT",
            "VTODO",
            "VJOURNAL",
            "VFREEBUSY",
            "VTIMEZONE",
        ];
        var allowedProperties = [
            "PRODID",
            "VERSION",
            "CALSCALE",
            "METHOD",
        ];
        var componentsFound = 0;
        this.children.forEach(function(child) {
            if (child.hasFeature(jsVObject_Component)) {
                componentsFound++;
                if (allowedComponents.indexOf(child.name) === -1) {
                    warnings.push({
                        "level": 1,
                        "message": "The " . child.name . " component is not allowed in the VCALENDAR component",
                        "node": this
                    });
                }
            }
            if (child.hasFeauture(jsVObject_Property)) {
                if (allowedProperties.indexOf(child.name) === -1) {
                    warnings.push({
                        "level": 2,
                        "message": "The " . child.name . " property is not allowed in the VCALENDAR component",
                        "node": this
                    });
                }
            }
        });

        if (componentsFound === 0) {
            warnings.push({
                "level": 1,
                "message": "An iCalendar object must have at least 1 component.",
                "node": this
            });
        }

        return warnings.concat(jsVObject_Component.validate.call(this));
    }
     */
});
