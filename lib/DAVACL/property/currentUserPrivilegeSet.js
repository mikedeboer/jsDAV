/**
 * CurrentUserPrivilegeSet
 *
 * This class represents the current-user-privilege-set property. When
 * requested, it contain all the privileges a user has on a specific node.
 *
 * @package jsDAV
 * @subpackage DAVACL
 * @copyright Copyright(c) 2011 Tri Tech Computers Ltd. <info AT tri-tech DOT com>
 * @author James Emerton <james AT tri-tech DOT com>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var Util = require('./../../DAV/util');

var jsDAV_Property = require('./../../DAV/property').jsDAV_Property;


function jsDAV_DAVACL_Property_CurrentUserPrivilegeSet(privileges) {
    this.privileges = privileges || [];
}

(function() {
    /**
     * Serializes the property in the DOM
     *
     * @param Sabre_DAV_Server $server
     * @param DOMElement $node
     * @return void
     */
    this.serialize = function(handler, xml) {
        for(var i=0; i<this.privileges.length; ++i)
            xml += '<d:privilege>'+handler.generateXmlTag(this.privileges[i])+'</d:privilege>';

        return xml;
    }
}).call(jsDAV_DAVACL_Property_CurrentUserPrivilegeSet.prototype = new jsDAV_Property());

exports.jsDAV_DAVACL_Property_CurrentUserPrivilegeSet = jsDAV_DAVACL_Property_CurrentUserPrivilegeSet;
