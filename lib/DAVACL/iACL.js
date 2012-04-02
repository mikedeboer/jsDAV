/**
 * ACL-enabled node
 *
 * If you want to add WebDAV ACL to a node, you must implement this class
 *
 * @package jsDAV
 * @subpackage DAVACL
 * @copyright Copyright(c) 2011 Tri Tech Computers Ltd. <info AT tri-tech DOT com>
 * @author James Emerton <james AT tri-tech DOT com>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";


var jsDAV = require("./../jsdav");
var Exc = require("./../DAV/exceptions");

var jsDAV_iNode = require('./../DAV/iNode').jsDAV_iNode;


function jsDAV_DAVACL_iACL() {
    jsDAV_iNode.call(this);

    this.REGBASE = this.REGBASE | jsDAV.__IACL__;
    /**
     * Returns the owner principal
     *
     * This must be a url to a principal, or null if there's no owner
     *
     * @return string|null
     */
    this.getOwner = function() { }

    /**
     * Returns a group principal
     *
     * This must be a url to a principal, or null if there's no owner
     *
     * @return string|null
     */
    this.getGroup = function() {
        return null;
    }

    /**
     * Returns a list of ACE's for this node.
     *
     * Each ACE has the following properties:
     *   * 'privilege', a string such as {DAV:}read or {DAV:}write. These are
     *     currently the only supported privileges
     *   * 'principal', a url to the principal who owns the node
     *   * 'protected' (optional), indicating that this ACE is not allowed to
     *      be updated.
     *
     * @return array
     */
    this.getACL = function() { }

    /**
     * Updates the ACL
     *
     * This method will receive a list of new ACE's.
     *
     * @param array $acl
     * @return void
     */
    this.setACL = function(acl, callback) {
        callback(new Exc.jsDAV_Exception_MethodNotAllowed('Changing ACL is not yet supported'));
    }

    /**
     * Returns the list of supported privileges for this node.
     *
     * The returned data structure is a list of nested privileges.
     * See Sabre_DAVACL_Plugin::getDefaultSupportedPrivilegeSet for a simple
     * standard structure.
     *
     * If null is returned from this method, the default privilege set is used,
     * which is fine for most common usecases.
     *
     * @return array|null
     */
    this.getSupportedPrivilegeSet = function() {
        return null;
    }
}

exports.jsDAV_DAVACL_iACL = jsDAV_DAVACL_iACL;
