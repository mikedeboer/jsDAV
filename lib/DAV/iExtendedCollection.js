/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
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
function jsDAV_iExtendedCollection() {
    this.REGBASE = this.REGBASE | jsDAV.__IEXTCOLLECTION__;

    /**
     * Creates a new collection
     *
     * @param string name
     * @param array resourceType
     * @param array properties
     * @return void
     */
    this.createExtendedCollection = function() {};
}

exports.jsDAV_iExtendedCollection = jsDAV_iExtendedCollection;
