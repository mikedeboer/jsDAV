/*
 * @package jsDAV
 * @subpackage DAVACL
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Daniel Laxar
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

"use strict";

var jsDAVACL_iBackend = require("./../interfaces/iBackend");

var Db = require("./../../shared/backends/postgres");
var Exc = require("./../../shared/exceptions");
var Util = require("./../../shared/util");

var Async = require("asyncjs");

/**
 * Postgre principal backend
 *
 * This backend assumes all principals are in a single table. The default table
 * is the 'users' table, but this can be overriden.
 */
var jsDAVACL_Backend_Postgre = module.exports = jsDAVACL_iBackend.extend({
    /**
     * Postgre
     *
     * @var postgres backend
     */
    pg: null,

    /**
     * PDO table name for 'principals'
     *
     * @var string
     */
    tableName: null,

    /**
     * PDO table name for 'group members'
     *
     * @var string
     */
    groupMembersTableName: null,

    /**
     * A list of additional fields to support
     *
     * @var array
     */
    fieldMap: {

        /**
         * This property can be used to display the users' real name.
         */
        "{DAV:}displayname": "displayname",

        /**
         * This property is actually used by the CardDAV plugin, where it gets
         * mapped to {http://calendarserver.org/ns/}me-card.
         *
         * The reason we don't straight-up use that property, is because
         * me-card is defined as a property on the users' addressbook
         * collection.
         */
        "{http://ajax.org/2005/aml}vcard-url": "vcardurl",
        
        /**
         * This is the users' primary email-address.
         */
        "{http://ajax.org/2005/aml}email-address": "email",
    },

    /**
     * Sets up the backend.
     *
     * @param Postgre backend
     * @param {String} tableName
     * @param {String} groupMembersTableName
     */
    initialize: function(backend, tableName, groupMembersTableName) {
        this.pg = backend;
        this.tableName = tableName || "principals";
        this.groupMembersTableName = groupMembersTableName || "groupmembers";

        this.fieldMapReverse = {};
        for (var prop in this.fieldMap)
            this.fieldMapReverse[this.fieldMap[prop]] = prop;
    },

    /**
     * Returns a list of principals based on a prefix.
     *
     * This prefix will often contain something like 'principals'. You are only
     * expected to return principals that are in this base path.
     *
     * You are expected to return at least a 'uri' for every user, you can
     * return any additional properties if you wish so. Common properties are:
     *   {DAV:}displayname
     *   {http://ajax.org/2005/aml}email-address - This is a custom jsDAV
     *     field that's actualy injected in a number of other properties. If
     *     you have an email address, use this property.
     *
     * @param {String} prefixPath
     * @return array
     */
    getPrincipalsByPrefix: function(prefixPath, callback) {
        var self = this;
        this.pg.query(
            "SELECT * FROM " + this.tableName + " WHERE \"uri\" LIKE $1",
            [prefixPath + "%"],
            function(err, result) {
                if (err)
                    return callback(err);
                
                callback(null, result.rows);
            }
        );
    },

    /**
     * Returns a specific principal, specified by it's path.
     * The returned structure should be the exact same as from
     * getPrincipalsByPrefix.
     *
     * @param {String} path
     * @return array
     */
    getPrincipalByPath: function(path, callback) {
        var self = this;
        this.pg.query(
            "SELECT * FROM " + this.tableName + " WHERE \"uri\" = $1",
            [path],
            function(err, result) {
                if (err)
                    return callback(err);
                
                callback(null, result.rows[0]);
            }
        );
    },

    /**
     * Updates one ore more webdav properties on a principal.
     *
     * The list of mutations is supplied as an array. Each key in the array is
     * a propertyname, such as {DAV:}displayname.
     *
     * Each value is the actual value to be updated. If a value is null, it
     * must be deleted.
     *
     * This method should be atomic. It must either completely succeed, or
     * completely fail. Success and failure can simply be returned as 'true' or
     * 'false'.
     *
     * It is also possible to return detailed failure information. In that case
     * an array such as this should be returned:
     *
     * {
     *   "200": {
     *      "{DAV:}prop1": null
     *   },
     *   "201": {
     *      "{DAV:}prop2": null
     *   },
     *   "403": {
     *      "{DAV:}prop3": null
     *   },
     *   "424": {
     *      "{DAV:}prop4": null
     *   }
     * }
     *
     * In this previous example prop1 was successfully updated or deleted, and
     * prop2 was succesfully created.
     *
     * prop3 failed to update due to '403 Forbidden' and because of this prop4
     * also could not be updated with '424 Failed dependency'.
     *
     * This last example was actually incorrect. While 200 and 201 could appear
     * in 1 response, if there's any error (403) the other properties should
     * always fail with 423 (failed dependency).
     *
     * But anyway, if you don't want to scratch your head over this, just
     * return true or false.
     *
     * @param {String} path
     * @param {Array} mutations
     * @return array|bool
     */
    updatePrincipal: function(path, mutations, callback) {
        var updateAble = {};
        var key, value, forbidden, failedDep, subKey;
        for (key in mutations) {
            value = mutations[key];
            // We are not aware of this field, we must fail.
            if (!this.fieldMap[key]) {
                forbidden = {};
                forbidden[key] = null;
                
                failedDep = {};
                // Adding the rest to the response as a 424
                for (subKey in mutations) {
                    if (subKey !== key)
                        failedDep[subKey] = null;
                }
                return callback({
                    "403": forbidden,
                    "424": failedDep
                }, false);
            }

            updateAble[this.fieldMap[key]] = value;
        }

        var prepareCounter = 1;
        var sets = "";
        var values = [];
        for (var prop in updateAble) {
            if (sets.length > 0)
                sets += ", ";
            sets += (prop + " = $" + prepareCounter++);
            values.push(updateAble[prop]);
        }

        values.push(path);

        this.pg.query(
            "UPDATE " + this.tableName + " SET " + sets + " WHERE \"uri\"= $" + prepareCounter, 
            values, 
            function(err, result) {
                if (err)
                    return callback(err, false);
                callback(null, true);
        });
    },

    /**
     * This method is used to search for principals matching a set of
     * properties.
     *
     * This search is specifically used by RFC3744's principal-property-search
     * REPORT. You should at least allow searching on
     * http://ajax.org/2005/aml}email-address.
     *
     * The actual search should be a unicode-non-case-sensitive search. The
     * keys in searchProperties are the WebDAV property names, while the values
     * are the property values to search on.
     *
     * If multiple properties are being searched on, the search should be
     * AND'ed.
     *
     * This method should simply return an array with full principal uri's.
     *
     * If somebody attempted to search on a property the backend does not
     * support, you should simply return 0 results.
     *
     * You can also just return 0 results if you choose to not support
     * searching at all, but keep in mind that this may stop certain features
     * from working.
     *
     * @param {String} prefixPath
     * @param {Array} searchProperties
     * @return array
     */
    searchPrincipals: function(prefixPath, searchProperties, callback) {
        // TODO: support search LATER
        callback(null, []);
    },

    /**
     * Returns the list of members for a group-principal
     *
     * @param {String} principal
     * @return array
     */
    getGroupMemberSet: function(principal, callback) {
        var self = this;
        this.getPrincipalByPath(principal, function(err, principal) {
            if (err)
                return callback(err);
            if (!principal)
                return callback(new Exc.jsDAV_Exception("Principal not found"));
    
            self.pg.query(
                "SELECT member FROM " + self.groupMembersTableName + " WHERE \"group\"=$1",
                [principal.uri],
                function(err, result) {
                    if (err)
                        return callback(err);

                    var out = result.rows.map(function(row) {
                        return row.member;
                    });
                    callback(null, out);
                }
            );
        });
    },

    /**
     * Returns the list of groups a principal is a member of
     *
     * @param {String} principal
     * @return array
     */
    getGroupMemberShip: function(principal, callback) {
        var self = this;
        this.getPrincipalByPath(principal, function(err, principal) {
            if (err)
                return callback(err);

            if (!principal)
                return callback(new Exc.jsDAV_Exception("Principal not found"));
    
            self.pg.query(
                "SELECT \"group\" FROM " + self.groupMembersTableName + " WHERE \"member\"=$1",
                [principal.uri],
                function(err, result) {
                    if (err)
                        return callback(err);

                    var out = result.rows.map(function(row) {
                        return row.group;
                    });
                    callback(null, out);
                }
            );
        });
    },

    /**
     * Updates the list of group members for a group principal.
     *
     * The principals should be passed as a list of uri's.
     *
     * @param {String} principal
     * @param {Array} members
     * @return void
     */
    setGroupMemberSet: function(principal, members, callback) {
        var self = this;
        this.pg.query(
            "DELETE FROM " + this.groupMembersTableName + " WHERE \"group\"=$1",
            [principal],
            function(err, result) {
                if (err)
                    return callback(err);

                Async.list(members)
                    .each(function(mem, next) {
                        self.pg.query(
                            "INSERT INTO " + self.groupMembersTableName +
                                " (\"group\", member) VALUES ($1, $2)",
                            [principal, mem], next);
                    })
                    .end(callback);
            }
        );
    }
});
