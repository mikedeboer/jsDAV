/*
 * @package jsDAV
 * @subpackage CalDAV
 * @copyright Copyright(c) 2011 Tri Tech Computers Ltd. <info AT tri-tech DOT com>
 * @author James Emerton <james AT tri-tech DOT com>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

function jsDAV_iPrincipalBackend() {
    /**
     * Returns a list of principals based on a prefix.
     *
     * This prefix will often contain something like 'principals'. You are only 
     * expected to return principals that are in this base path.
     *
     * You are expected to return at least a 'uri' for every user, you can 
     * return any additional properties if you wish so. Common properties are:
     *   {DAV:}displayname 
     *   {http://sabredav.org/ns}email-address - This is a custom SabreDAV 
     *     field that's actualy injected in a number of other properties. If
     *     you have an email address, use this property.
     * 
     * @param string $prefixPath 
     * @return array 
     */
    this.getPrincipalsByPrefix = function(prefixPath, callback) { }

    /**
     * Returns a specific principal, specified by it's path.
     * The returned structure should be the exact same as from 
     * getPrincipalsByPrefix. 
     * 
     * @param string $path 
     * @return array 
     */
    this.getPrincipalByPath = function(path, callback) { }

    /**
     * This method is used to search for principals matching a set of 
     * properties.
     *
     * This search is specifically used by RFC3744's principal-property-search 
     * REPORT. You should at least allow searching on 
     * http://sabredav.org/ns}email-address.
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
     * @param string $prefixPath 
     * @param array $searchProperties 
     * @return array 
     */
    this.searchPrincipals = function(prefixPath, searchProperties, callback) { }

    /**
     * Returns the list of members for a group-principal 
     * 
     * @param string $principal 
     * @return array 
     */
    this.getGroupMemberSet = function(principal, callback) { }

    /**
     * Returns the list of groups a principal is a member of 
     * 
     * @param string $principal 
     * @return array 
     */
    this.getGroupMembership = function(principal, callback) { }

    /**
     * Updates the list of group members for a group principal.
     *
     * The principals should be passed as a list of uri's. 
     * 
     * @param string $principal 
     * @param array $members 
     * @return void
     */
    this.setGroupMemberSet = function(principal, members, callback) { }
}

exports.jsDAV_iPrincipalBackend = jsDAV_iPrincipalBackend;
