/**
 * The UserCalenders class contains all calendars associated to one user
 *
 * @package jsDAV
 * @subpackage CalDAV
 * @copyright Copyright(c) 2011 Tri Tech Computers Ltd. <info AT tri-tech DOT com>
 * @author James Emerton <james AT tri-tech DOT com>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */


var jsDAV = require('./../jsdav');

var jsDAV_DAVACL_iACL = require('./../DAVACL/iACL').jsDAV_DAVACL_iACL;


function jsDAV_CalDAV_UserCalendars(principalBackend, caldavBackend, principalInfo) {
    this.principalBackend = principalBackend;
    this.caldavBackend = caldavBackend;
    this.principalInfo = principalInfo;
}

(function() {
    this.implement(jsDAV_DAVACL_iACL);

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
                'principal': this.principalInfo['uri'],
                'protected': true
            },
            {
                'privilege': '{DAV:}write',
                'principal': this.principalInfo['uri'],
                'protected': true
            },
            {
                'privilege': '{DAV:}read',
                'principal': this.principalInfo['uri']+'/calendar-proxy-write',
                'protected': true
            },
            {
                'privilege': '{DAV:}write',
                'principal': this.principalInfo['uri']+'/calendar-proxy-write',
                'protected': true
            },
            {
                'privilege': '{DAV:}read',
                'principal': this.principalInfo['uri']+'/calendar-proxy-read',
                'protected': true
            }
        ];
    }
}).call(jsDAV_CalDAV_UserCalendars.prototype = new jsDAV.jsDAV_Base());
//}).call(jsDAV_CalDAV_UserCalendars.prototype = new jsDAV_IExtendedCollection());
//

exports.jsDAV_CalDAV_UserCalendars = jsDAV_CalDAV_UserCalendars;
