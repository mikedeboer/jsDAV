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
var Exc = require('./../DAV/exceptions');

var jsDAV_iCollection = require('./../DAV/iCollection').jsDAV_iCollection;
var jsDAV_iExtendedCollection = require('./../DAV/iExtendedCollection').jsDAV_iExtendedCollection;
var jsDAV_DAVACL_iACL = require('./../DAVACL/iACL').jsDAV_DAVACL_iACL;

var jsDAV_CalDAV_Calendar = require('./calendar').jsDAV_CalDAV_Calendar;


function jsDAV_CalDAV_UserCalendars(principalBackend, caldavBackend, principalInfo) {
    this.principalBackend = principalBackend;
    this.caldavBackend = caldavBackend;
    this.principalInfo = principalInfo;
}

(function() {
    this.implement(jsDAV_iCollection, jsDAV_iExtendedCollection, jsDAV_DAVACL_iACL);

    /**
     * Returns a single calendar, by name
     *
     * @param string $name
     * @todo needs optimizing
     * @return Sabre_CalDAV_Calendar
     */
    this.getChild = function(name, cbgetchild) {
        this.getChildren(function(err, children) {
            if(err) return cbgetchild(err);

            for(var i=0; i<children.length; ++i) {
                if(children[i].getName() == name)
                    return cbgetchild(null, children[i]);
            }

            cbgetchild(new Exc.jsDAV_Exception_FileNotFound("Calendar with name '"+name+ "' could not be found"));
        });
    }

    /**
     * Checks if a calendar exists.
     *
     * @param string $name
     * @todo needs optimizing
     * @return bool
     */
    this.childExists = function(name, cbchildexists) {
        this.getChild(name, function(err, child) {
            cbchildexists(null, child !== undefined);
        });
    }

    /**
     * Returns a list of calendars
     *
     * @return array
     */
    this.getChildren = function(cbgetchildren) {
        var self = this;
        this.caldavBackend.getCalendarsForUser(this.principalInfo.uri, function(err, calendars) {
            if(err) return cbgetchildren(err);

            var objs = [];
            for(var i=0; i<calendars.length; ++i)
                objs.push(new jsDAV_CalDAV_Calendar(self.principalBackend, self.caldavBackend, calendars[i]));

            cbgetchildren(null, objs);
        });

    }

    /**
     * Creates a new calendar
     *
     * @param string $name
     * @param array $resourceType
     * @param array $properties
     * @return void
     */
    this.createExtendedCollection = function(name, resourceType, properties, cbcreateextcoll) {
        if (resourceType.indexOf('{urn:ietf:params:xml:ns:caldav}calendar') == -1 || resourceType.length !== 2)
            return cbcreateextcoll(new Exc.jsDAV_Exception_InvalidResourceType(
                'Unknown resourceType for this collection'));

        this.caldavBackend.createCalendar(this.principalInfo.uri, name, properties, cbcreateextcoll);
    }

    /**
     * Returns the owner principal
     *
     * This must be a url to a principal, or null if there's no owner
     *
     * @return string|null
     */
    this.getOwner = function() {
        return this.principalInfo.uri;
    }

    /**
     * Returns a group principal
     *
     * This must be a url to a principal, or null if there's no owner
     *
     * @return string|null
     */
    this.getGroup = function() {
        return null;
    }


    /**
     * Updates the ACL
     *
     * This method will receive a list of new ACE's.
     *
     * @param array $acl
     * @return void
     */
    this.setACL = function(acl) {
        throw new Exc.jsDAV_Exception_MethodNotAllowed('Changing ACL is not yet supported');
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
        return null;
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

exports.jsDAV_CalDAV_UserCalendars = jsDAV_CalDAV_UserCalendars;
