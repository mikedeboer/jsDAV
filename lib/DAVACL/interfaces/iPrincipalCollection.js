/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_iNode = require("./../../DAV/interfaces/iNode");

var Exc = require("./../../shared/exceptions");

/**
 * Principal Collection interface.
 *
 * Implement this interface to ensure that your principal collection can be
 * searched using the principal-property-search REPORT.
 */
var jsDAVACL_iPrincipalCollection = module.exports = jsDAV_iNode.extend({
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
     * This method should simply return a list of 'child names', which may be
     * used to call this#getChild() in the future.
     *
     * @param {Array} searchProperties
     * @return array
     */
    searchPrincipals: function(searchProperties, callback) { callback(Exc.notImplementedYet()); }
});
