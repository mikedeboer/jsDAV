/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV          = require("./../../jsdav");
var jsDAV_Property = require("./../property").jsDAV_Property;

var Util           = require("./../util");
var Exc            = require("./../exceptions");
var Util = require("./../util");

function jsDAV_Property_Response(href, responseProperties) {
    this.href               = href;
    this.responseProperties = responseProperties || {};
}

exports.jsDAV_Property_Response = jsDAV_Property_Response;

(function() {
    this.REGBASE = this.REGBASE | jsDAV.__PROP_RESPONSE__;

    /**
     * Returns the url
     *
     * @return {string}
     */
    this.getHref = function() {
        return this.href;
    };

    /**
     * Returns the property list
     *
     * @return {array}
     */
    this.getResponseProperties = function() {
        return this.responseProperties;
    };

    /**
     * serialize
     *
     * @param {jsDAV_Server} server
     * @param {String}       dom
     * @return void
     */
    this.serialize = function(handler, dom) {
        var properties = this.responseProperties;

        dom += "<d:response>"
            // Adding the baseurl to the beginning of the url
            +  "<d:href>" + Util.escapeXml(encodeURI(handler.server.getBaseUri()) + this.href) + "</d:href>\n";

        // The properties variable is an array containing properties, grouped by
        // HTTP status
        var resHttpStatus, resPropertyGroup, resPropertyName, resPropertyValue,
            resNodeName, resCurrentProperty, resBlockProps;

        for (resHttpStatus in properties) {
            resPropertyGroup = properties[resHttpStatus];
            // The 'href' is also in this hashmap, and it's special cased.
            // We will ignore it
            if (!resPropertyGroup || resHttpStatus == "href")
                continue;

            resBlockProps = "";

            for (resPropertyName in resPropertyGroup) {
                if (typeof resPropertyName != "string")
                    continue;


                resPropertyValue = resPropertyGroup[resPropertyName];
                resCurrentProperty = "";
                var propName = Util.fromClarkNotation(resPropertyName);

                // If the namespace was defined in the top-level xml namespaces, it means
                // there was already a namespace declaration, and we don't have to worry about it.
                if (propName[0] && handler.xmlNamespaces[propName[0]]) {
                    resNodeName = handler.xmlNamespaces[propName[0]] + ":" + propName[1];
                    resCurrentProperty = "<" + resNodeName;
                }
                else {
                    // Define the namespace for this node directly...
                    resNodeName        = propName[1];
                    resCurrentProperty = "<" + resNodeName + " xmlns=\"" + propName[0] + "\"";
                }

                if(resPropertyValue === null) {
                    // There is no value, return a short tag
                    resCurrentProperty += "/>";
                }
                else if (typeof resPropertyValue != "object") {
                    resCurrentProperty += ">" + Util.escapeXml(resPropertyValue) + "</" + resNodeName + ">";
                }
                else if (resPropertyValue.hasFeature && resPropertyValue.hasFeature(jsDAV.__PROPERTY__)) {
                    resCurrentProperty += ">";
                    resCurrentProperty = resPropertyValue.serialize(handler, resCurrentProperty)
                        +  "</" + resNodeName + ">";
                }
                else if (resPropertyValue) {
                    throw new Exc.jsDAV_Exception("Unknown property value type: "
                        + resPropertyValue + " for property: " + resPropertyName);
                }

                resBlockProps += resCurrentProperty;
            }

            // If there are no properties in this group, we can also just carry on
            if (resBlockProps) {
                dom += "<d:propstat><d:prop>" + resBlockProps + "</d:prop>"
                    +  "<d:status>" + handler.getStatusMessage(resHttpStatus) + "</d:status>"
                    +  "</d:propstat>";
            }
        }
        
        return dom + "</d:response>";
    };
}).call(jsDAV_Property_Response.prototype = new jsDAV_Property());
