/**
 * supported-collation-set property
 *
 * This property is a representation of the supported-collation-set property
 * in the CalDAV namespace.
 *
 * @package jsDAV
 * @subpackage CalDAV
 * @copyright Copyright(c) 2011 Tri Tech Computers Ltd. <info AT tri-tech DOT com>
 * @author James Emerton <james AT tri-tech DOT com>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV_Property = require("./../../DAV/property").jsDAV_Property;


function jsDAV_CalDAV_Property_SupportedCollationSet() {
}

(function() {

    /**
     * Serializes the property in a DOM document
     *
     * @param Sabre_DAV_Server $server
     * @param DOMElement $node
     * @return void
     */
    this.serialize = function(handler, xml) {
        return xml +
            handler.generateXmlTag('{urn:ietf:params:xml:ns:caldav}supported-collation', 'i;ascii-casemap') +
            handler.generateXmlTag('{urn:ietf:params:xml:ns:caldav}supported-collation', 'i;octet') +
            handler.generateXmlTag('{urn:ietf:params:xml:ns:caldav}supported-collation', 'i;unicode-casemap');
    }
}).call(jsDAV_CalDAV_Property_SupportedCollationSet.prototype = new jsDAV_Property());


module.exports = jsDAV_CalDAV_Property_SupportedCollationSet;
