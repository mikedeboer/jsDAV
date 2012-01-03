/**
 * The CalendarObject represents a single VEVENT or VTODO within a Calendar.
 *
 * @package jsDAV
 * @subpackage CalDAV
 * @copyright Copyright(c) 2011 Tri Tech Computers Ltd. <info AT tri-tech DOT com>
 * @author James Emerton <james AT tri-tech DOT com>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var crypto = require('crypto');

var Exc = require("./../DAV/exceptions");

var jsDAV = require('./../jsdav');
var jsDAV_CalDAV_iCalendarObject = require('./iCalendarObject').jsDAV_CalDAV_iCalendarObject;

var jsDAV_iFile = require("./../DAV/iFile").jsDAV_iFile;
var jsDAV_iCalendarObject = require('./iCalendarObject').jsDAV_iCalendarObject;
var jsDAV_DAVACL_iACL = require('./../DAVACL/iACL').jsDAV_DAVACL_iACL;


function jsDAV_CalDAV_CalendarObject(caldavBackend, calendarInfo, objectData) {
    this.caldavBackend = caldavBackend;

    if (objectData.calendarid === undefined)
        throw new Exc.jsDAV_Exception('The objectData argument must contain a \'calendarid\' property');

    if (objectData.uri === undefined)
        throw new Exc.jsDAV_Exception('The objectData argument must contain an \'uri\' property');

    this.calendarInfo = calendarInfo;
    this.objectData = objectData;
}

(function() {
    this.implement(jsDAV_iFile, jsDAV_iCalendarObject, jsDAV_DAVACL_iACL);

    /**
     * Returns the uri for this object
     *
     * @return string
     */
    this.getName = function() {
        return this.objectData.uri;
    }

    /**
     * Returns the ICalendar-formatted object
     *
     * @return string
     */
    this.get = function(callback) {
        // Pre-populating the 'calendardata' is optional, if we don't have it
        // already we fetch it from the backend.
        if(this.objectData.calendardata !== undefined)
            return callback(null, new Buffer(this.objectData.calendardata));

        var self = this;
        this.caldavBackend.getCalendarObject(this.objectData.calendarid, this.objectData.uri, function(err, data) {
            if(err) return callback(err);
            self.objectData = data;
            callback(null, new Buffer(self.objectData.calendardata));
        });
    }

    /**
     * Updates the ICalendar-formatted object
     *
     * @param string $calendarData
     * @return void
     */
    this.put = function(calendarData, type, callback) {
        if(calendarData instanceof Buffer)
            calendarData = calendarData.toString('utf8');

//        // TODO: Validate calendar data!
//        $supportedComponents = null;
//        $sccs = '{' . Sabre_CalDAV_Plugin::NS_CALDAV . '}supported-calendar-component-set';
//        if (isset($this->calendarInfo[$sccs]) && $this->calendarInfo[$sccs] instanceof Sabre_CalDAV_Property_SupportedCalendarComponentSet) {
//            $supportedComponents = $this->calendarInfo[$sccs]->getValue();
//        }
//        Sabre_CalDAV_ICalendarUtil::validateICalendarObject($calendarData, $supportedComponents);

        var self = this;
        this.caldavBackend.updateCalendarObject(this.calendarInfo.id, this.objectData.uri, calendarData, function(err) {
            if(err) return callback(err);
            self.objectData.calendardata = calendarData;
            callback(null);
        });
    }

    /**
     * Deletes the calendar object
     *
     * @return void
     */
    this['delete'] = function(callback) {
        this.caldavBackend.deleteCalendarObject(this.calendarInfo.id, this.objectData.uri, callback);
    }

    /**
     * Returns the mime content-type
     *
     * @return string
     */
    this.getContentType = function(callback) {
        callback(null, 'text/calendar');
    }

    /**
     * Returns an ETag for this object.
     *
     * The ETag is an arbitrary string, but MUST be surrounded by double-quotes.
     *
     * @return string
     */
    this.getETag = function(callback) {
        if(this.objectData.etag !== undefined)
            return callback(null, this.objectData.etag);

        this.get(function(err, data) {
            if(err) return callback(err);
            var hash = crypto.createHash('md5');
            hash.update(data);
            callback(null, '"'+hash.digest('hex')+'"');
        });
    }

    /**
     * Returns the last modification date as a unix timestamp
     *
     * @return time
     */
    this.getLastModified = function(callback) {
        callback(null, this.objectData.lastmodified);
    }

    /**
     * Returns the size of this object in bytes
     *
     * @return int
     */
    this.getSize = function(callback) {
        if(this.objectData.size !== undefined)
            return callback(null, this.objectData.size);

        this.get(function(err, data) {
            if(err) return callback(err);
            callback(null, data.length);
        });
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
                'protected': true,
            },
            {
                'privilege': '{DAV:}write',
                'principal': this.calendarInfo['principaluri'],
                'protected': true,
            },
            {
                'privilege': '{DAV:}read',
                'principal': this.calendarInfo['principaluri']+'/calendar-proxy-write',
                'protected': true,
            },
            {
                'privilege': '{DAV:}write',
                'principal': this.calendarInfo['principaluri']+'/calendar-proxy-write',
                'protected': true,
            },
            {
                'privilege': '{DAV:}read',
                'principal': this.calendarInfo['principaluri']+'/calendar-proxy-read',
                'protected': true,
            }
        ];
    }
}).call(jsDAV_CalDAV_CalendarObject.prototype = new jsDAV.jsDAV_Base());

exports.jsDAV_CalDAV_CalendarObject = jsDAV_CalDAV_CalendarObject;

