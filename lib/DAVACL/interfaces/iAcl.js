/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var Base = require("./../../shared/base");
var Exc = require("./../../shared/exceptions");

/**
 * Implement this interface to create your own principal backends.
 *
 * Creating backends for principals is entirely optional. You can also
 * implement jsDAVACL_iPrincipal directly. This interface is used solely by
 * jsDAVACL_AbstractPrincipalCollection.
 */
var jsDAVACL_iAcl = module.exports = Base.extend({
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
     *     field that's actually injected in a number of other properties. If
     *     you have an email address, use this property.
     *
     * @param {String} prefixPath
     * @return array
     */
    getPrincipalsByPrefix: function(prefixPath, callback) { callback(Exc.notImplementedYet()); },

    /**
     * Returns a specific principal, specified by it's path.
     * The returned structure should be the exact same as from
     * getPrincipalsByPrefix.
     *
     * @param {String} path
     * @return array
     */
    getPrincipalByPath: function(path, callback) { callback(Exc.notImplementedYet()); },

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
     * };
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
    updatePrincipal: function(path, mutations, callback) { callback(Exc.notImplementedYet()); },

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
    searchPrincipals: function(prefixPath, searchProperties, callback) { callback(Exc.notImplementedYet()); },

    /**
     * Returns the list of members for a group-principal
     *
     * @param {String} principal
     * @return array
     */
    getGroupMemberSet: function(principal, callback) { callback(Exc.notImplementedYet()); },

    /**
     * Returns the list of groups a principal is a member of
     *
     * @param {String} principal
     * @return array
     */
    getGroupMembership: function(principal, callback) { callback(Exc.notImplementedYet()); },

    /**
     * Updates the list of group members for a group principal.
     *
     * The principals should be passed as a list of uri's.
     *
     * @param {String} principal
     * @param {Array} members
     * @return void
     */
    setGroupMemberSet: function(principal, members, callback) { callback(Exc.notImplementedYet()); }
});
