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
var jsDAV_CalDAV_CalendarObject = require('./calendarObject').jsDAV_CalDAV_CalendarObject;

var jsDAV_Property_Principal = require('./../DAVACL/property/principal').jsDAV_Property_Principal;
var jsDAV_CalDAV_Property_SupportedCalendarData = require('./property/supportedCalendarData');
var jsDAV_CalDAV_Property_SupportedCollationSet = require('./property/supportedCollationSet');


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
     * Updates properties such as the display name and description
     *
     * @param array $mutations
     * @return array
     */
    this.updateProperties = function(mutations, callback) {
        this.caldavBackend.updateCalendar(this.calendarInfo.id, mutations, callback);
    }
    
    /**
     * Returns the list of properties
     *
     * @param array $requestedProperties
     * @return array
     */
    this.getProperties = function(requestedProperties) {
        var response = {};

        for(var i=0; i<requestedProperties.length; ++i) {
            var prop = requestedProperties[i];
            switch(prop) {
                case '{urn:ietf:params:xml:ns:caldav}supported-calendar-data':
                    response[prop] = new jsDAV_CalDAV_Property_SupportedCalendarData();
                    break;

                case '{urn:ietf:params:xml:ns:caldav}supported-collation-set':
                    response[prop] =  new jsDAV_CalDAV_Property_SupportedCollationSet();
                    break;

                case '{DAV:}owner':
                    response[prop] = new jsDAV_Property_Principal(
                        jsDAV_Property_Principal.HREF, this.calendarInfo.principaluri);
                    break;

                default:
                    if(this.calendarInfo[prop])
                        response[prop] = this.calendarInfo[prop];
                    break;
            }
        }

        return response;
    }


    /**
     * Returns a calendar object
     *
     * The contained calendar objects are for example Events or Todo's.
     *
     * @param string $name
     * @return Sabre_DAV_ICalendarObject
     */
    this.getChild = function(name, cbgetchild) {
        this.caldavBackend.getCalendarObject(this.calendarInfo.id, name, function(err, obj) {
            if(err) return cbgetchild(err);
            if(!obj) return cbgetchild(new Exc.jsDAV_Exception_FileNotFound('Calendar object not found'));

            cbgetchild(null, new jsDAV_CalDAV_CalendarObject(this.caldavBackend, this.calendarInfo, obj));
        });
    }

    /**
     * Returns the full list of calendar objects
     *
     * @return array
     */
    this.getChildren = function(callback) {
        this.caldavBackend.getCalendarObjects(this.calendarInfo.id, function(err, objs) {
            if(err) return callback(err);

            var children = [];
            for(var i=0; i<objs.length; ++i)
                children.push(new jsDAV_CalDAV_CalendarObject(this.caldavBackend, this.calendarInfo, objs[i]));
            callback(null, children);
        });
    }

    /**
     * Checks if a child-node exists.
     *
     * @param string $name
     * @return bool
     */
    this.childExists = function(name, callback) {
        this.caldavBackend.getCalendarObject(this.calendarInfo.id, name, function(err, obj) {
            if(err) callback(err, false);
            else callback(null, true);
        });
    }


    /**
     * Creates a new directory
     *
     * We actually block this, as subdirectories are not allowed in calendars.
     *
     * @param string $name
     * @return void
     */
    this.createDirectory = function(name, callback) {
        callback(new Exc.jsDAV_Exception_MethodNotAllowed(
                'Creating collections in calendar objects is not allowed'));
    }

    /**
     * Creates a new file
     *
     * The contents of the new file must be a valid ICalendar string.
     *
     * @param string $name
     * @param resource $calendarData
     * @return void
     */
    this.createFile = function(name, calendarData, callback) {
        if(calendarData === undefined)
            calendarData = "";
        else if(calendarData instanceof Buffer)
            calendarData = calendarData.toString('utf8');

//        TODO: Validate calendar data...
//        $supportedComponents = null;
//        $sccs = '{' . Sabre_CalDAV_Plugin::NS_CALDAV . '}supported-calendar-component-set';
//        if (isset($this->calendarInfo[$sccs]) && $this->calendarInfo[$sccs] instanceof Sabre_CalDAV_Property_SupportedCalendarComponentSet) {
//            $supportedComponents = $this->calendarInfo[$sccs]->getValue();
//        }
//        Sabre_CalDAV_ICalendarUtil::validateICalendarObject($calendarData, $supportedComponents);

        this.caldavBackend.createCalendarObject(this.calendarInfo.id, name, calendarData, callback);
    }

    /**
     * Deletes the calendar.
     *
     * @return void
     */
    this['delete'] = function(callback) {
        this.caldavBackend.deleteCalendar(this.calendarInfo.id, callback);
    }

    /**
     * Renames the calendar. Note that most calendars use the
     * {DAV:}displayname to display a name to display a name.
     *
     * @param string $newName
     * @return void
     */
    this.setName = function(name, callback) {
        callback(new Exc.jsDAV_Exception_MethodNotAllowed('Renaming calendars is not yet supported'));
    }

    /**
     * Returns the last modification date as a unix timestamp.
     *
     * @return void
     */
    this.getLastModified = function(callback) {
        callback(null, null);
    }

    /**
     * Returns the owner principal
     *
     * This must be a url to a principal, or null if there's no owner
     *
     * @return string|null
     */
    this.getOwner = function() {
        return this.calendarInfo.principaluri;
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
