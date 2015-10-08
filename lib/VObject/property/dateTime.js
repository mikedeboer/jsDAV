/*
 * @package jsDAV
 * @subpackage VObject
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Oleg Elifantiev <oleg@elifantiev.ru>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsVObject_Property = require("./../property");
var jsVObject_DateTimeParser = require("./../dateTimeParser");
var moment = require("moment");

var jsVObject_Property_DateTime = module.exports = jsVObject_Property.extend({


    /**
     * The currently used delimiter.
     *
     * @var string
     */
    delimiter: ",",

    setValue: function(value) {
        if (value instanceof Array && value[0] && value[0] instanceof Date) {
            this.setDateTimes(value);
        } else if (value instanceof Date) {
            this.setDateTimes([value]);
        } else {
            this.value = value;
        }
    },


    setDateTimes: function(dts, isFloating) {
        var values = [], tz, isUtc, d;

        if(this.hasTime()) {

            tz = null;
            isUtc = false;

            for(d in dts) {

                if (isFloating) {
                    values.push(moment(d).format("Ymd\\THis"));
                    continue;
                }
                if (!tz) {
                    // FIXME
                    tz = d.getTimeZone();
                    isUtc = tz in {"UTC": 1, "GMT": 1, "Z": 1};
                    if (!isUtc) {
                        this.add("TZID", tz);
                    }
                } else {
                    // FIXME
                    d.setTimeZone(tz);
                }

                if (isUtc) {
                    // FIXME
                    values.push(moment(d).format("Ymd\\THis\\Z"));
                } else {
                    // FIXME
                    values.push(moment(d).format("Ymd\\THis"));
                }

            }
            if (isUtc || isFloating) {
                this.unset("TZID");
            }

        } else {

            for(d in dts) {
                values.push(moment(d).format("Ymd"));
            }

            this.unset("TZID");

        }

        this.value = values;
    },

    hasTime: function() {
        return true;
        // FIXME
        //return strtoupper((string)$this["VALUE"]) !== "DATE";
    },

    getDateTime: function() {

        var dt = this.getDateTimes();
        if (!dt) {
            return null;
        }

        return dt[0];

    },

    getDateTimes: function() {

        // Finding the timezone.
        var tz = this.get("TZID");

        if (!tz) {
            // FIXME
            tz = "UTC"; //TimeZoneUtil::getTimeZone((string)$tz, $this->root);
        }

        return this.getParts().map(function(part){
            return jsVObject_DateTimeParser.parse(part, tz);
        });
    },


    /**
     * Set a compound value as an array.
     *
     * @param {Array|*} parts
     */
    setParts: function(parts) {
        if (parts[0] && parts[0] instanceof Date) {
            this.setDateTimes(parts);
        } else {
            this.value = parts instanceof Array ? parts.join(this.delimiter) : parts;
        }
    }
});
