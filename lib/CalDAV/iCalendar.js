/**
 * Calendar interface
 *
 * Implement this interface to allow a node to be recognized as an calendar.
 *
 * @package jsDAV
 * @subpackage CalDAV
 * @copyright Copyright(c) 2011 Tri Tech Computers Ltd. <info AT tri-tech DOT com>
 * @author James Emerton <james AT tri-tech DOT com>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV = require('./../jsdav');
var jsDAV_iCollection = require('./../DAV/iCollection').jsDAV_iCollection;


function jsDAV_CalDAV_iCalendar() {
    jsDAV_iCollection.call(this);

    this.REGBASE = this.REGBASE | jsDAV.__ICALENDAR__;
}

exports.jsDAV_CalDAV_iCalendar = jsDAV_CalDAV_iCalendar;

