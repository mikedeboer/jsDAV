/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_Property = require("./../property");
var jsDAV_Property_Response = require("./../property/response");

var jsDAV_Property_Response = module.exports = jsDAV_Property.extend({
    /**
     * Response objects.
     *
     * @var array
     */
    responses: [],

    /**
     * The only valid argument is a list of Sabre\DAV\Property\Response
     * objects.
     *
     * @param {Array} responses;
     */
    initialize: function(responses) {
        responses.forEach(function(response) {
            if (!response.hasFeature(jsDAV_Property_Response))
                throw new Error("You must pass an array of jsDAV_Property_Response objects");
        });
        this.responses = responses;
    },

    /**
     * serialize
     *
     * @param {jsDAV_Server} server
     * @param {String}       dom
     * @return void
     */
    serialize: function(handler, dom) {
        var aXml = [];
        this.responses.forEach(function(response) {
            aXml.push(response.serialize(handler, ""));
        });
        return dom + aXml.join("");
    }
});
