/*
 * @package jsDAV
 * @subpackage DAVACL
 * @copyright Copyright(c) 2011 Tri Tech Computers Ltd. <info AT tri-tech DOT com>
 * @author James Emerton <james AT tri-tech DOT com>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var Exc = require("./../../DAV/exceptions");
var Util = require("./../../DAV/util");

var jsDAV_Property = require("./../../DAV/property").jsDAV_Property;
var jsDAV_Property_Href = require("./../../DAV/property/href").jsDAV_Property_Href;


function jsDAV_Property_Princpal(type, href) {
    this.type = type;
    if (type === jsDAV_Property_Princpal.HREF && href === undefined) {
        throw new Exc.jsDAV_Exception('The href argument must be specified for the HREF principal type.');
    }
    this.href = href;
}

(function() {

    /**
     * To specify a not-logged-in user, use the UNAUTHENTICTED principal
     */
    this.UNAUTHENTICATED = 1;

    /**
     * To specify any principal that is logged in, use AUTHENTICATED
     */
    this.AUTHENTICATED = 2;

    /**
     * Specific principals can be specified with the HREF
     */
    this.HREF = 3;

    /**
     * Everybody, basically
     */
    this.ALL = 4;

    /**
     * Returns the principal type
     *
     * @return int
     */
    this.getType = function() {
        return this.type;
    }

    /**
     * Returns the principal uri.
     *
     * @return string
     */
    this.getHref = function() {
        return this.href;
    }

    this.serialize = function(handler, lmDom) {
        switch(this.type) {
            case jsDAV_Property_Princpal.UNAUTHENTICATED:
                return lmDom+'<unauthenticated/>';
                
            case jsDAV_Property_Princpal.AUTHENTICATED:
                return lmDom+'<authenticated/>';

            case jsDAV_Property_Princpal.HREF:
                var href = new jsDAV_Property_Href(this.href, true);
                return href.serialize(handler, lmDom);
        }
    }

    /**
     * Deserializes a DOM element into a property object.
     *
     * @param DOMElement $dom
     * @return Sabre_DAV_Property_Principal
     */
    this.unserialize = function(dom) {
        var parentNode = dom.firstChild;

        switch(Util.toClarkNotation(parentNode)) {
            case '{DAV:}unauthenticated' :
                return new jsDAV_Property_Princpal(this.UNAUTHENTICATED);
            case '{DAV:}authenticated' :
                return new jsDAV_Property_Princpal(this.AUTHENTICATED);
            case '{DAV:}href':
                return new jsDAV_Property_Princpal(this.HREF, parentNode.textContent);
            case '{DAV:}all':
                return new jsDAV_Property_Princpal(this.ALL);
            default:
                throw new Exc.jsDAV_Exception_BadRequest(
                    'Unexpected element ('+Util.toClarkNotation(parentNode)+'). Could not deserialize');
        }
    }
}).call(jsDAV_Property_Princpal.prototype = new jsDAV_Property());

exports.jsDAV_Property_Princpal = jsDAV_Property_Princpal;
