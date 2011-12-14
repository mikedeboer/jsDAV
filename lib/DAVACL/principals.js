/*
 * @package jsDAV
 * @subpackage DAVACL
 * @copyright Copyright(c) 2011 Tri Tech Computers Ltd. <info AT tri-tech DOT com>
 * @author James Emerton <james AT tri-tech DOT com>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var Async = require("./../../support/async.js");
var Exc = require("./../DAV/exceptions");
var Util = require("./../DAV/util");

var jsDAV_iProperties = require("./../DAV/iProperties").jsDAV_iProperties;

var jsDAV_Directory = require("./../DAV/directory").jsDAV_Directory;
var jsDAV_Principal = require("./principal").jsDAV_Principal;

var jsDAV_Property_CurrentUserPrincpal = require("./property/currentUserPrincipal").jsDAV_Property_CurrentUserPrincpal;



function jsDAV_PrincipalCollection(backend, prefix) {
    this.backend = backend;
    this.prefix = prefix || "principals";
}

(function() {
    this.implement(jsDAV_iProperties);
    this.disableListing = false;

    /**
     * This method returns a node for a principal.
     *
     * The passed array contains principal information, and is guaranteed to
     * at least contain a uri item. Other properties may or may not be
     * supplied by the authentication backend.
     * 
     * @param array $principalInfo 
     * @return Sabre_DAVACL_IPrincipal
     */
    this.getChildForPrincipal = function(principal) {
        return new jsDAV_Principal(this.backend, principal);
    }

    /**
     * Returns the name of this collection. 
     * 
     * @return string 
     */
    this.getName = function()  {
        return Util.splitPath(this.prefix)[1];
    }

    /**
     * Return the list of users 
     * 
     * @return void
     */
    this.getChildren = function(cbgetchildren) {
        if (this.disableListing)
            throw new Exc.jsDAV_Exception_MethodNotAllowed('Listing members of this collection is disabled');

        var children = [];
        var self = this;
        this.backend.getPrincipalsByPrefix(this.prefix, function(err, principals) {
            if(err) return cbgetchildren(err);

            Async.list(principals)
                 .each(function(principal, cbnextprin) {
                     children.push(self.getChildForPrincipal(principal));
                     cbnextprin();
                 })
                 .end(function(err) {
                     cbgetchildren(err, children);
                 });
        });
    }

    /**
     * Returns a child object, by its name.
     * 
     * @param string $name
     * @throws Sabre_DAV_Exception_FileNotFound
     * @return Sabre_DAV_IPrincipal
     */
    this.getChild = function(name, cbgetchild) {
        var self = this;
        this.backend.getPrincipalByPath(this.prefix+"/"+name, function(err, principal) {
            if(err) return cbgetchild(err);
            if(principal === undefined)
                return cbgetchild(new Exc.jsDAV_Exception_FileNotFound("Principal with name "+name+" not found"));

            cbgetchild(null, self.getChildForPrincipal(principal));
        });
    }

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
     * This method should simply return a list of 'child names', which may be 
     * used to call $this->getChild in the future.
     *
     * @param array $searchProperties 
     * @return array 
     */
    this.searchPrincipals = function(searchProperties, cbsearch) {
        var results = [];
        this.backend.searchPrincipals(this.prefix, searchProperties, function(err, result) {
            Async.list(result)
                 .each(function(row, cbnext) {
                     results.push(Util.splitPath(row)[1]);
                 })
                 .end(function(err) {
                     cbsearch(err, results);
                 });
        });
    } 

    this.getProperties = function(properties) {
        return {
             // TODO: This property should be available everywhere
             "{DAV:}current-user-principal": new jsDAV_Property_CurrentUserPrincpal(this.prefix)
        };
    }

}).call(jsDAV_PrincipalCollection.prototype = new jsDAV_Directory());

exports.jsDAV_PrincipalCollection = jsDAV_PrincipalCollection;
