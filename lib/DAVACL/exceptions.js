/*
 * @package jsDAV
 * @subpackage DAVACL
 * @copyright Copyright(c) 2011 Tri Tech Computers Ltd. <info AT tri-tech DOT com>
 * @author James Emerton <james AT tri-tech DOT com>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var Exc = require("./../DAV/exceptions");

/**
 * NeedPrivileges
 *
 * The 403-need privileges is thrown when a user didn't have the appropriate
 * permissions to perform an operation
 */
function jsDAV_DAVACL_Exception_NeedPrivileges(uri, privileges) {
    this.type = "jsDAV_DAVACL_Exception_NeedPrivileges";
    this.message = 'User did not have the required privileges ('+privileges.join(', ')+') for path "'+uri+'"';
    this.uri = uri;
    this.privileges = privileges;
}

jsDAV_DAVACL_Exception_NeedPrivileges.prototype = new Exc.jsDAV_Exception_Forbidden();

jsDAV_DAVACL_Exception_NeedPrivileges.prototype.serialize = function(handler, errorNode) {
    errorNode += "<d:need-privileges>";

    for(var i=0; i<privileges.length; ++i) {
        errorNode += "<d:resource><d:href>"+handler.server.getBaseUri()+uri+"</d:href>"+
            "<d:privilege>"+handler.generateXmlTag(privileges[i])+"</d:privilege></d:resource>";
    }

    return errorNode;
}

exports.jsDAV_DAVACL_Exception_NeedPrivileges = jsDAV_DAVACL_Exception_NeedPrivileges;
