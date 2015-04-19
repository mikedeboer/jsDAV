/*
 * @package jsDAV
 * @subpackage CardDAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_Property = require("./../../DAV/property");
var jsCardDAV_Plugin = require("./../plugin");

var Xml = require("./../../shared/xml");

/**
 * Supported-address-data property
 *
 * This property is a representation of the supported-address-data property
 * in the CardDAV namespace.
 */
var jsCardDAV_Property_SupportedAddressData = module.exports = jsDAV_Property.extend({
    /**
     * supported versions
     *
     * @var array
     */
    supportedData: [],

    /**
     * Creates the property
     *
     * @param array|null supportedData
     */
    initialize: function(supportedData) {
        if (!supportedData) {
            supportedData = [
                { contentType: "text/vcard", version: "3.0" },
                { contentType: "text/vcard", version: "4.0" }
            ];
        }

       this.supportedData = supportedData;
    },

    /**
     * Serializes the property in a DOMDocument
     *
     * @param jsDAV_Handler handler
     * @param {String} dom
     * @return void
     */
    serialize: function(handler, dom) {
        var prefix = Xml.xmlNamespaces[jsCardDAV_Plugin.NS_CARDDAV] 
            ? Xml.xmlNamespaces[jsCardDAV_Plugin.NS_CARDDAV]
            : "card";

        var aXml = [];
        this.supportedData.forEach(function(supported) {
            aXml.push("<" + prefix + ":address-data-type xmlns:" + prefix + "=\"" + 
                jsCardDAV_Plugin.NS_CARDDAV + "\" content-type=\"" + 
                supported.contentType + "\" version=\"" + supported.version + "\" />");
        });
        
        return dom + aXml.join("");
    }
});
