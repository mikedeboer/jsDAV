/*
 * @package jsDAV
 * @subpackage CalDAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Romain Foucault <rmfoucault AT gmail DOT com>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_File = require("./../DAV/file");
var jsCalDAV_iCalendarObject = require("./interfaces/iCalendarObject");
var jsDAVACL_iAcl = require("./../DAVACL/interfaces/iAcl")

var Exc = require("./../shared/exceptions");
var Util = require("./../shared/util");

/**
 * The Calendar object represents a single Calendar Object from a calendar
 */
var jsCalDAV_Card = module.exports = jsDAV_File.extend(jsCalDAV_iCalendarObject, jsDAVACL_iAcl, {
    /**
     * CalDav backend
     *
     * @var jsCalDAV_iBackend
     */
    caldavBackend: null,

    /**
     * array with information about this CalendarObject
     *
     * @var object
     */
    calData: {},

    /**
     * array with information about the containing Calendar
     *
     * @var object
     */
    calendarInfo: {},

    /**
     * Constructor
     *
     * @param Backend\BackendInterface caldavBackend
     * @param {Array} calendarInfo
     * @param {Array} calData
     */
    initialize: function(caldavBackend, calendarInfo, calData) {
        this.caldavBackend = caldavBackend;
        this.calendarInfo = calendarInfo;
        this.calData = calData;
    },

    /**
     * Returns the uri for this object
     *
     * @return string
     */
    getName: function() {
        return this.calData.uri;
    },

    /**
     * Returns the ICAL-formatted object
     *
     * @return string
     */
    get: function(callback) {
        if (this.calData.calendardata)
            return callback(null, this.calData.calendardata)

        // Pre-populating 'calendardata' is optional. If we don't yet have it
        // already, we fetch it from the backend.
        var self = this;
        this.caldavBackend.getCalendarObject(this.calendarInfo.id, this.calData.uri, function(err, calData) {
            if (err)
                return callback(err);

            self.calData.calendardata = calData;
            callback(null, self.calData.calendardata);
        });
    },

    /**
     * Updates the ICAL-formatted object
     *
     * @param {String} calData
     * @return string|null
     */
    put: function(calData, enc, callback) {
        var self = this;
        if (Buffer.isBuffer(calData))
            calData = calData.toString("utf8");
        this.caldavBackend.updateCalendarObject(this.calendarInfo.id, this.calData.uri, calData, function(err, etag) {
            if (err)
                return callback(err);

            self.calData.calendardata = calData;
            self.calData.etag = etag;
            callback(null, etag);
         });
    },

    /**
     * Deletes the calendar object
     *
     * @return void
     */
    "delete": function(callback) {
        this.caldavBackend.deleteCalendarObject(this.calendarInfo.id, this.calData.uri, callback);
    },

    /**
     * Returns the mime content-type
     *
     * @return string
     */
    getContentType: function(callback) {
        callback(null, "text/calendar; charset=utf-8");
    },

    /**
     * Returns an ETag for this object
     *
     * @return string
     */
    getETag: function(callback) {
        if (this.calData.etag)
            return callback(null, this.calData.etag);

        this.get(function(err, data) {
            if (err)
                return callback(err);
            callback(null, '"' + Util.createHash(data) + '"');
        });
    },

    /**
     * Returns the last modification date as a unix timestamp
     *
     * @return int
     */
    getLastModified: function(callback) {
        callback(null, this.calData.lastmodified ? this.calData.lastmodified : null);
    },

    /**
     * Returns the size of this object in bytes
     *
     * @return int
     */
    getSize: function(callback) {
        if (this.calData.size)
            return callback(null, this.calData.size);

        this.get(function(err, calData) {
            if (err)
                return callback(err);
            callback(null, calData.length);
        });
    },

    /**
     * Returns the owner principal
     *
     * This must be a url to a principal, or null if there's no owner
     *
     * @return string|null
     */
    getOwner: function() {
        return this.calendarInfo.principaluri;
    },

    /**
     * Returns a group principal
     *
     * This must be a url to a principal, or null if there's no owner
     *
     * @return string|null
     */
    getGroup: function() {
        return null;
    },

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
    getACL: function() {
        return [
            {
                "privilege" : "{DAV:}read",
                "principal" : this.calendarInfo.principaluri,
                "protected" : true
            },
            {
                "privilege" : "{DAV:}write",
                "principal" : this.calendarInfo.principaluri,
                "protected" : true
            }
        ];
    },

    /**
     * Updates the ACL
     *
     * This method will receive a list of new ACE's.
     *
     * @param {Array} acl
     * @return void
     */
    setACL: function(acl, callback) {
        callback(new Exc.MethodNotAllowed("Changing ACL is not yet supported"));
    },

    /**
     * Returns the list of supported privileges for this node.
     *
     * The returned data structure is a list of nested privileges.
     * See jsDAVACL_Plugin.getDefaultSupportedPrivilegeSet for a simple
     * standard structure.
     *
     * If null is returned from this method, the default privilege set is used,
     * which is fine for most common usecases.
     *
     * @return array|null
     */
    getSupportedPrivilegeSet: function() {
        return null;
    }
});
