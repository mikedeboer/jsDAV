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

        dom += "<d:response>"
            // Adding the baseurl to the beginning of the url
            +  "<d:href>" + server.getBaseUri() + escape(this.href) + "</d:href>";

        // The properties variable is an array containing properties, grouped by
        // HTTP status
        var resHttpStatus, resPropertyGroup, resNsList, resPropertyName, resPropertyValue,
            resPropName, resNodeName, resCurrentProperty,
            resBlockProps = "";

        for (resHttpStatus in properties) {
            resPropertyGroup = properties[resHttpStatus];
            // The 'href' is also in this hashmap, and it's special cased.
            // We will ignore it
            if (!resPropertyGroup || resHttpStatus == "href") continue;

            resNsList = server.xmlNamespaces;

            for (resPropertyName in resPropertyGroup) {
                if (typeof resPropertyName != "string"
                  || !(resPropertyValue = resPropertyGroup[resPropertyName]))
                    continue;

                resCurrentProperty = "";
                resPropName        = resPropertyName.match(/^\{([^\}]*)\}(.*)/);

                // special case for empty namespaces
                if (!resPropName || resPropName[1] == "") {
                    resNodeName        = resPropertyName;
                    resCurrentProperty = "<" + resNodeName + " xmlns=\"\"";
                }
                else {
                    if (!resNsList[resPropName[1]])
                        resNsList[resPropName[1]] = "x" + Object.keys(resNsList).length;

                    // If the namespace was defined in the top-level xml namespaces, it means
                    // there was already a namespace declaration, and we don't have to worry about it.
                    if (server.xmlNamespaces[resPropName[1]]) {
                        resNodeName = resNsList[resPropName[1]] + ":" + resPropName[2]
                        resCurrentProperty = "<" + resNodeName;
                    }
                    else {
                        resNodeName        = resNsList[resPropName[1]] + ":" + resPropName[2];
                        resCurrentProperty = "<" + resNodeName + " xmlns=\"" + resPropName[1] + "\"";
                    }
                }

                if (typeof resPropertyValue != "object") {
                    resCurrentProperty += ">" + resPropertyValue + "</" + resNodeName + ">";
                }
                else if (resPropertyValue.hasFeature && resPropertyValue.hasFeature(jsDAV.__PROPERTY__)) {
                    resCurrentProperty += ">";
                    resCurrentProperty = resPropertyValue.serialize(server, resCurrentProperty)
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
                    +  "<d:status>" + server.getStatusMessage(resHttpStatus) + "</d:status>"
                    +  "</d:propstat>";
            }
        }
        
        return dom;
    };
}).call(jsDAV_Property_Response.prototype = new jsDAV_Property());
