/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV          = require("./../../jsdav"),
    jsDAV_Property = require("./../property").jsDAV_Property,

    Util           = require("./../util"),
    Exc            = require("./../exceptions");

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
    this.serialize = function(server, dom) {
        var properties = this.responseProperties;

        dom += "><d:response>"
            // Adding the baseurl to the beginning of the url
            +  "<d:href>" + server.getBaseUri() + escape(this.href) + "</d:href>";

        // The properties variable is an array containing properties, grouped by
        // HTTP status
        var httpStatus, propertyGroup, nsList, propertyName, propertyValue, propName,
            nodeName, currentProperty,
            blockProps = "";

        for (httpStatus in properties) {
            propertyGroup = properties[httpStatus];
            // The 'href' is also in this hashmap, and it's special cased.
            // We will ignore it
            if (httpStatus == "href") continue;

            nsList = server.xmlNamespaces;

            for (propertyName in propertyGroup) {
                if (typeof propertyName != "string") continue;

                propertyValue   = propertyGroup[propertyName];
                currentProperty = "";
                propName        = propertyName.match(/^{([^}]*)}(.*)/g);

                // special case for empty namespaces
                if (propName[1] == "") {
                    nodeName        = propName[2];
                    currentProperty = "<" + nodeName + " xmlns=\"\"";
                }
                else {
                    if (!nsList[propName[1]])
                        nsList[propName[1]] = "x" . Util.hashCount(nsList);

                    // If the namespace was defined in the top-level xml namespaces, it means
                    // there was already a namespace declaration, and we don't have to worry about it.
                    if (server.xmlNamespaces[propName[1]]) {
                        nodeName = nsList[propName[1]] + ":" + propName[2]
                        currentProperty = "<" + nodeName;
                    }
                    else {
                        nodeName        = nsList[propName[1]] + ":" + propName[2];
                        currentProperty = "<" + nodeName + " xmlns=\"" + propName[1] + "\"";
                    }
                }

                if (typeof propertyValue != "object") {
                    currentProperty += ">" + propertyValue + "</" + nodeName + ">";
                }
                else if (propertyValue.hasFeature && propertyValue.hasFeature(jsDAV.__PROPERTY__)) {
                    currentProperty += ">" + propertyValue.serialize(server, currentProperty)
                                    +  "</" + nodeName + ">";
                }
                else if (propertyValue) {
                    throw new Exc.jsDAV_Exception("Unknown property value type: "
                        + propertyValue + " for property: " + propertyName);
                }

                blockProps += currentProperty;
            }

            // If there are no properties in this group, we can also just carry on
            if (blockProps) {
                dom += "<d:propstat><d:prop>" + blockProps + "</d:props>"
                    +  "<d:status>" + server.getStatusMessage(httpStatus) + "</d:status>";
            }
        }
    };
}).call(jsDAV_Property_Response.prototype = new jsDAV.jsDAV_Property());
