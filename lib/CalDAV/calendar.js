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
var Util = require('./../DAV/util');

var jsDAV_iProperties = require('./../DAV/iProperties').jsDAV_iProperties;
var jsDAV_DAVACL_Plugin = require('./../DAVACL/plugin');
var jsDAV_DAVACL_iACL = require('./../DAVACL/iACL').jsDAV_DAVACL_iACL;

var jsDAV_CalDAV_Plugin = require('./plugin');
var jsDAV_CalDAV_iCalendar = require('./iCalendar').jsDAV_CalDAV_iCalendar;


function jsDAV_CalDAV_Calendar(principalBackend, caldavBackend, calendarInfo) {
    this.principalBackend = principalBackend;
    this.caldavBackend = caldavBackend;
    this.calendarInfo = calendarInfo;
}

(function() {
    this.implement(jsDAV_CalDAV_iCalendar, jsDAV_iProperties, jsDAV_DAVACL_iACL);

    this.getName = function() {
        return Util.splitPath(this.calendarInfo.uri)[1];
    }

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

    /**
     * Returns the list of supported privileges for this node.
     *
     * The returned data structure is a list of nested privileges.
     * See Sabre_DAVACL_Plugin::getDefaultSupportedPrivilegeSet for a simple
     * standard structure.
     *
     * If null is returned from this method, the default privilege set is used,
     * which is fine for most common usecases.
     *
     * @return array|null
     */
    this.getSupportedPrivilegeSet = function() {
        var dflt = jsDAV_DAVACL_Plugin.getDefaultSupportedPrivilegeSet();

        // We need to inject 'read-free-busy' in the tree, aggregated under
        // {DAV:}read.
        for(var i=0; i<dflt.aggregates.length; ++i) {
            if(dflt.aggregates[i].privilege === '{DAV:}read') {
                dflt.aggregates[i].aggregates.push({
                    privilege: '{'+jsDAV_CalDAV_Plugin.NS_CALDAV+'}read-free-busy',
                    abstract: true
                });
            }
        }

        return dflt;
    }
}).call(jsDAV_CalDAV_Calendar.prototype = new jsDAV.jsDAV_Base());

exports.jsDAV_CalDAV_Calendar = jsDAV_CalDAV_Calendar;
