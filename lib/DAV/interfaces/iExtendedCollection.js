/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var Base = require("./../../shared/base");
var Exc = require("./../../shared/exceptions");

/**
 * The iExtendedCollection interface.
 *
 * This interface can be used to create special-type of collection-resources
 * as defined by RFC 5689.
 */
var jsDAV_iExtendedCollection = module.exports = Base.extend({
    /**
     * Creates a new collection
     *
     * @param {String} name
     * @param {Array} resourceType
     * @param {Array} properties
     * @return void
     */
    createExtendedCollection: function(name, resourceType, properties, callback) { callback(Exc.notImplementedYet()); }
});
