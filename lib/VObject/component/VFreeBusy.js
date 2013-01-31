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
 * The VFreeBusy component
 *
 * This component adds functionality to a component, specific for VFREEBUSY
 * components.
 */
var jsVObject_Component_VFreeBusy = module.exports = jsVObject_Component.extend({
    /**
     * Checks based on the contained FREEBUSY information, if a timeslot is
     * available.
     *
     * @param Date start
     * @param Date end
     * @return bool
     */
    isFree: function(start, end) {
        var matches = this.select("FREEBUSY");
        var freebusy, periods, period, j, l2, tmp;
        for (var i = 0, l = matches.length; i < l; ++i) {
            freebusy = matches[i];
            // We are only interested in FBTYPE=BUSY (the default),
            // FBTYPE=BUSY-TENTATIVE or FBTYPE=BUSY-UNAVAILABLE.
            if (freebusy.FBTYPE && freebusy.FBTYPE.toString().substr(0, 4).toUpperCase() != "BUSY")
                return;

            // The freebusy component can hold more than 1 value, separated by
            // commas.
            var periods = freebusy.toString().split(",");
            for (j = 0, l2 = periods.length; j < l2; ++j) {
                period = periods[j];
                // Every period is formatted as [start]/[end]. The start is an
                // absolute UTC time, the end may be an absolute UTC time, or
                // duration (relative) value.
                var parts = period.split("/");
                var busyStart = jsVObject_DateTimeParser.parse(parts[0]);
                var busyEnd = jsVObject_DateTimeParser.parse(parts[1]);

                if (busyEnd instanceof DateInterval) {
                    tmp = busyStart.clone();
                    tmp.add(busyEnd);
                    busyEnd = tmp;
                }

                if (start < busyEnd && end > busyStart)
                    return false;
            }
        }

        return true;
    }
});
