/**
 * Supported component set property
 *
 * This property is a representation of the supported-calendar_component-set
 * property in the CalDAV namespace. It simply requires an array of components,
 * such as VEVENT, VTODO
 *
 * @package jsDAV
 * @subpackage CalDAV
 * @copyright Copyright (C) 2007-2012 Rooftop Solutions. All rights reserved.
 * @copyright Copyright(c) 2012 Tri Tech Computers Ltd. <info AT tri-tech DOT com>
 * @author Evert Pot (http://www.rooftopsolutions.nl/) 
 * @author James Emerton <james AT tri-tech DOT com>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV_Property = require("./../../DAV/property").jsDAV_Property;


function jsDAV_CalDAV_Property_SupportedCalendarComponentSet(components) {
    this.components = components;
}

(function() {
    /**
     * Returns the list of supported components
     *
     * @return array
     */
    this.valueOf = function() {
        return this.components;
    }

    /**
     * Serializes the property in a DOMDocument
     *
     * @param Sabre_DAV_Server $server
     * @param DOMElement $node
     * @return void
     */
    this.serialize = function(handler, xml) {
        for(var i=0; i<this.components.length; ++i)
            xml += handler.generateXmlTag('{urn:ietf:params:xml:ns:caldav}comp', null, {
                name: this.components[i] });

        return xml;
    }
}).call(jsDAV_CalDAV_Property_SupportedCalendarComponentSet.property = new jsDAV_Property());

module.exports = jsDAV_CalDAV_Property_SupportedCalendarComponentSet;

