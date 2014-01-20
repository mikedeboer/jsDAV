/*
 * @package jsDAV
 * @subpackage VObject
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsVObject_Reader = require("./../reader");
var jsVObject_Component = require("./../component");

var Assert = require("assert");

describe("test VCard component parsing", function() {

    var testData = [];

    it("should correctly parse the " + testData.length + " data samples", function() {
        testData.forEach(function(data, idx) {
            var vcard = jsVObject_Reader.new().read(data[0]);

            var warnings = vcard.validate();

            warnings.forEach(function(warning) {
                Assert.ok(data[1].indexOf(warning.message) > -1, "{" + (idx + 1) + "} Warning '" + warning.message + "' not expected: " + JSON.stringify(data[1]));
            });

            vcard.validate(jsVObject_Component.REPAIR);

            Assert.equal(data[2], vcard.serialize());
        });
    });
});
