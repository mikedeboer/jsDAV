/**
 * This object represents a CalDAV calendar.
 *
 * A calendar can contain multiple TODO and or Events. These are represented
 * as Sabre_CalDAV_CalendarObject objects.
 *
 * @package jsDAV
 * @subpackage CalDAV
 * @copyright Copyright(c) 2011 Tri Tech Computers Ltd. <info AT tri-tech DOT com>
 * @author James Emerton <james AT tri-tech DOT com>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */


var jsDAV = require('./../jsdav');

var jsDAV_iProperties = require('./../DAV/iProperties').jsDAV_iProperties;
var jsDAV_DAVACL_iACL = require('./../DAVACL/iACL').jsDAV_DAVACL_iACL;
var jsDAV_CalDAV_iCalendar = require('./iCalendar').jsDAV_CalDAV_iCalendar;


function jsDAV_CalDAV_Calendar() {
}

(function() {
    this.implement(jsDAV_CalDAV_iCalendar, jsDAV_iProperties, jsDAV_DAVACL_IACL);

    /**
     * Returns a list of ACE's for this node.
     *
     * Each ACE has the following properties:
     *   * 'privilege', a string such as {DAV:}read or {DAV:}write. These are
     *     currently the only supported privileges
     *   * 'principal', a url to the principal who owns the node
     *   * 'protected' (optional), indicating that this ACE is not allowed to
     *      be updated.
     *
     * @return array
     */
    this.getACL = function() {
        return [
            {
                'privilege': '{DAV:}read',
                'principal': this.calendarInfo['principaluri'],
                'protected': true
            },
            {
                'privilege': '{DAV:}write',
                'principal': this.calendarInfo['principaluri'],
                'protected': true
            },
            {
                'privilege': '{DAV:}read',
                'principal': this.calendarInfo['principaluri']+'/calendar-proxy-write',
                'protected': true
            },
            {
                'privilege': '{DAV:}write',
                'principal': this.calendarInfo['principaluri']+'/calendar-proxy-write',
                'protected': true
            },
            {
                'privilege': '{DAV:}read',
                'principal': this.calendarInfo['principaluri']+'/calendar-proxy-read',
                'protected': true
            },
            {
                'privilege': '{'+jsDAV_CalDAV_Plugin.NS_CALDAV+'}read-free-busy',
                'principal': '{DAV:}authenticated',
                'protected': true
            }
        ];
    }
}).call(jsDAV_CalDAV_Calendar.prototype = new jsDAV.jsDAV_Base());
