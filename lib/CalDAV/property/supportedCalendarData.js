/**
 * Supported-calendar-data property
 *
 * This property is a representation of the supported-calendar-data property
 * in the CalDAV namespace. SabreDAV only has support for text/calendar;2.0
 * so the value is currently hardcoded.
 *
 * @package jsDAV
 * @subpackage CalDAV
 * @copyright Copyright(c) 2011 Tri Tech Computers Ltd. <info AT tri-tech DOT com>
 * @author James Emerton <james AT tri-tech DOT com>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV_Property = require("./../../DAV/property").jsDAV_Property;


function jsDAV_CalDAV_Property_SupportedCalendarData() {
}

(function() {
    /**
     * Serializes the property in a DOMDocument
     *
     * @param Sabre_DAV_Server $server
     * @param DOMElement $node
     * @return void
     */
    this.serialize = function(handler, xml) {
        return xml + handler.generateXmlTag('{urn:ietf:params:xml:ns:caldav}calendar-data',
            null, { 'content-type': 'text/calendar', 'version': '2.0' });
    }
}).call(jsDAV_CalDAV_Property_SupportedCalendarData.property = new jsDAV_Property());

module.exports = jsDAV_CalDAV_Property_SupportedCalendarData;
