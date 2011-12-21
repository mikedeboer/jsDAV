/**
 * CalendarObject interface
 *
 * Extend the ICalendarObject interface to allow your custom nodes to be picked up as
 * CalendarObjects.
 *
 * Calendar objects are resources such as Events, Todo's or Journals.
 *
 * @package jsDAV
 * @subpackage CalDAV
 * @copyright Copyright(c) 2011 Tri Tech Computers Ltd. <info AT tri-tech DOT com>
 * @author James Emerton <james AT tri-tech DOT com>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV = require('./../lib/jsdav');


function jsDAV_iCalendarObject() {
    this.REGBASE = this.REGBASE | jsDAV.__ICALENDAROBJECT__;
}

exports.jsDAV_iCalendarObject = jsDAV_iCalendarObject;


