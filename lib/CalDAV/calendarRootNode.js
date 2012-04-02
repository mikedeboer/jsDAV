/**
 * Users collection
 *
 * This object is responsible for generating a collection of users.
 *
 * @package jsDAV
 * @subpackage CalDAV
 * @copyright Copyright(c) 2011 Tri Tech Computers Ltd. <info AT tri-tech DOT com>
 * @author James Emerton <james AT tri-tech DOT com>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";


var jsDAV_PrincipalCollection = require('./../DAVACL/principals').jsDAV_PrincipalCollection;
var jsDAV_CalDAV_Plugin = require('./plugin');
var jsDAV_CalDAV_UserCalendars = require('./userCalendars').jsDAV_CalDAV_UserCalendars;

/**
 * Constructor
 *
 * This constructor needs both an authentication and a caldav backend.
 *
 * By default this class will show a list of calendar collections for
 * principals in the 'principals' collection. If your main principals are
 * actually located in a different path, use the $principalPrefix argument
 * to override this.
 *
 *
 * @param Sabre_DAVACL_IPrincipalBackend $principalBackend
 * @param Sabre_CalDAV_Backend_Abstract $caldavBackend
 * @param string $principalPrefix
 */
function jsDAV_CalDAV_CalendarRootNode(principalBackend, calendarBackend) {
    this.principalBackend = principalBackend;
    this.calendarBackend = calendarBackend;
}

(function() {
    /**
     * Returns the nodename
     *
     * We're overriding this, because the default will be the 'principalPrefix',
     * and we want it to be Sabre_CalDAV_Plugin::CALENDAR_ROOT
     *
     * @return string
     */
    this.getName = function() {
        return jsDAV_CalDAV_Plugin.CALENDAR_ROOT;
    }

    /**
     * This method returns a node for a principal.
     *
     * The passed array contains principal information, and is guaranteed to
     * at least contain a uri item. Other properties may or may not be
     * supplied by the authentication backend.
     *
     * @param array $principal
     * @return Sabre_DAV_INode
     */
    this.getChildForPrincipal = function(principal) {
        return new jsDAV_CalDAV_UserCalendars(this.principalBackend, this.calendarBackend, principal);
    }
}).call(jsDAV_CalDAV_CalendarRootNode.prototype = new jsDAV_PrincipalCollection());

exports.jsDAV_CalDAV_CalendarRootNode = jsDAV_CalDAV_CalendarRootNode;
