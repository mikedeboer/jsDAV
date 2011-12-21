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
    this.privileges = privileges;
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
        for(var priv in this.privileges)
            xml += this.serializePriv(priv);

        return xml;
    }

    /**
     * Serializes one privilege
     *
     * @param string $privName
     * @return void
     */
    this.serializePriv = function(privName) {
        // XXX: This currently assumes all privs are in the {DAV:} namespace
        var priv = Util.fromClarkNotation(privName);
        return "<d:privilege><d:"+priv[1]+"/></d:privilege>";
    }
}).call(jsDAV_DAVACL_Property_CurrentUserPrivilegeSet.prototype = new jsDAV_Property());

exports.jsDAV_DAVACL_Property_CurrentUserPrivilegeSet = jsDAV_DAVACL_Property_CurrentUserPrivilegeSet;
