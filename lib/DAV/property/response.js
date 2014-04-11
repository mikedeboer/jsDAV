/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_Property = require("./../property");

var Exc = require("./../../shared/exceptions");
var Util = require("./../../shared/util");
var Xml = require("./../../shared/xml");

var jsDAV_Property_Response = module.exports = jsDAV_Property.extend({
    initialize: function(href, responseProperties) {
        this.href = href;
        this.responseProperties = responseProperties || {};
    },

    /**
     * Returns the url
     *
     * @return {string}
     */
    getHref: function() {
        return this.href;
    },

    /**
     * Returns the property list
     *
     * @return {array}
     */
    getResponseProperties: function() {
        return this.responseProperties;
    },

    /**
     * serialize
     *
     * @param {jsDAV_Server} server
     * @param {String}       dom
     * @return void
     */
    serialize: function(handler, dom) {
        var properties = this.responseProperties;

        var aXml = [
            "<d:response>",
            // Adding the baseurl to the beginning of the url
            "<d:href>" + Xml.escapeXml(encodeURI(handler.server.getBaseUri() + this.href)) + "</d:href>"
        ];

        // The properties variable is an array containing properties, grouped by
        // HTTP status
        var resHttpStatus, resPropertyGroup, resPropertyName, resPropertyValue,
            resPropName, resPrefix, resNodeName, resCurrentProperty;

        var resNsList = Util.extend({}, Xml.xmlNamespaces);

        for (resHttpStatus in properties) {
            resPropertyGroup = properties[resHttpStatus];
            // The 'href' is also in this hashmap, and it's special cased.
            // We will ignore it
            if (!resPropertyGroup || resHttpStatus == "href")
                continue;

            // If there are no properties in this group, we can also just carry on
            if (!Object.keys(resPropertyGroup).length)
                continue;

            aXml.push("<d:propstat><d:prop>");

            for (resPropertyName in resPropertyGroup) {
                if (typeof resPropertyName != "string")
                    continue;

                resPropertyValue = resPropertyGroup[resPropertyName];
                resCurrentProperty = "";
                resPropName = resPropertyName.match(/^\{([^\}]*)\}(.*)$/);

                // special case for empty namespaces
                if (!resPropName || resPropName[1] === "") {
                    resNodeName = resPropName[2];
                    resCurrentProperty = "<" + resNodeName + " xmlns=\"\"";
                }
                else {
                    if (!resNsList[resPropName[1]])
                        resNsList[resPropName[1]] = "x" + Object.keys(resNsList).length;

                    // If the namespace was defined in the top-level xml namespaces, it means
                    // there was already a namespace declaration, and we don't have to worry about it.
                    if (Xml.xmlNamespaces[resPropName[1]]) {
                        resNodeName = resNsList[resPropName[1]] + ":" + resPropName[2];
                        resCurrentProperty = "<" + resNodeName;
                    }
                    else {
                        resPrefix = resNsList[resPropName[1]];
                        resNodeName = resPrefix + ":" + resPropName[2];
                        resCurrentProperty = "<" + resNodeName + " xmlns:" + resPrefix + "=\"" + resPropName[1] + "\"";
                    }
                }

                if (Util.isScalar(resPropertyValue)) {
                    resCurrentProperty += ">" + Xml.escapeXml(resPropertyValue) + "</" + resNodeName + ">";
                }
                else if (resPropertyValue) {
                    if (resPropertyValue.hasFeature(jsDAV_Property)) {
                        resCurrentProperty += ">";
                        resCurrentProperty = resPropertyValue.serialize(handler, resCurrentProperty)
                            +  "</" + resNodeName + ">";
                    }
                    else {
                        throw new Exc.jsDAV_Exception("Unknown property value type: "
                            + resPropertyValue + " for property: " + resPropertyName);
                    }
                }
                else {
                    resCurrentProperty += "/>";
                }

                aXml.push(resCurrentProperty);
            }

            aXml.push(
                "</d:prop>",
                "<d:status>" + handler.getStatusMessage(resHttpStatus) + "</d:status>",
                "</d:propstat>"
            );
        }

        return dom + aXml.join("") + "</d:response>";
    }
});
