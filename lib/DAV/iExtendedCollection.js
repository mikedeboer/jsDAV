/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV             = require("./../jsdav"),
    jsDAV_iCollection = require("./iCollection").jsDAV_iCollection;

/**
 * The iExtendedCollection interface.
 *
 * This interface can be used to create special-type of collection-resources
 * as defined by RFC 5689.
 */
function jsDAV_iExtendedCollection() {};

exports.jsDAV_iExtendedCollection = jsDAV_iExtendedCollection;
    
(function() {
    this.REGBASE = this.REGBASE | jsDAV.__IEXTCOLLECTION__;

    /**
     * Creates a new collection
     *
     * @param string name
     * @param array resourceType
     * @param array properties
     * @return void
     */
    this.createExtendedCollection = function(name, resourceType, properties, callback) {};
}).call(jsDAV_iExtendedCollection.prototype = new jsDAV_iCollection());
