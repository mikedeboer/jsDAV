/*
 * @package jsDAV
 * @subpackage CardDAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAVACL_AbstractPrincipalCollection = require("./../DAVACL/abstractPrincipalCollection");
var jsCardDAV_Plugin = require("./plugin");
var jsCardDAV_UserAddressBooks = require("./userAddressBooks");

/**
 * AddressBook rootnode
 *
 * This object lists a collection of users, which can contain addressbooks.
 */
var jsCardDAV_AddressBookRoot = module.exports = jsDAVACL_AbstractPrincipalCollection.extend({
    /**
     * Principal Backend
     *
     * @var jsDAVACL_iPrincipalBackend
     */
    principalBackend: null,

    /**
     * CardDAV backend
     *
     * @var jsCardDAV_iBackend
     */
    carddavBackend: null,

    /**
     * Constructor
     *
     * This constructor needs both a principal and a carddav backend.
     *
     * By default this class will show a list of addressbook collections for
     * principals in the 'principals' collection. If your main principals are
     * actually located in a different path, use the principalPrefix argument
     * to override this.
     *
     * @param jsDAVACL_iPrincipalBackend principalBackend
     * @param jsCardDAV_iBackend carddavBackend
     * @param {String} principalPrefix
     */
    initialize: function(principalBackend, carddavBackend, principalPrefix) {
        this.carddavBackend = carddavBackend;
        jsDAVACL_AbstractPrincipalCollection.initialize.call(this, principalBackend, principalPrefix ||  "principals");
    },

    /**
     * Returns the name of the node
     *
     * @return string
     */
    getName: function() {
        return jsCardDAV_Plugin.ADDRESSBOOK_ROOT;
    },

    /**
     * This method returns a node for a principal.
     *
     * The passed array contains principal information, and is guaranteed to
     * at least contain a uri item. Other properties may or may not be
     * supplied by the authentication backend.
     *
     * @param {Array} principal
     * @return jsDAV_iNode
     */
    getChildForPrincipal: function(principal) {
        return jsCardDAV_UserAddressBooks.new(this.carddavBackend, principal.uri);
    }
});
