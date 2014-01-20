/*
 * @package jsDAV
 * @subpackage VObject
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsVObject_Reader = require("../../reader");
var jsVObject_Component = require("../../component");

var Assert = require("assert");

describe("test VCard component parsing", function() {

    var testData = [
        // Correct
        [
            "BEGIN:VCARD\r\nVERSION:4.0\r\nFN:John Doe\r\nEND:VCARD\r\n",
            [],
            "BEGIN:VCARD\r\nVERSION:4.0\r\nFN:John Doe\r\nEND:VCARD\r\n",
        ],

        // No VERSION
        [
            "BEGIN:VCARD\r\nFN:John Doe\r\nEND:VCARD\r\n",
            [
                'The VERSION property must appear in the VCARD component exactly 1 time',
            ],
            "BEGIN:VCARD\r\nVERSION:4.0\r\nFN:John Doe\r\nEND:VCARD\r\n",
        ],

        // Unknown version
        [
            "BEGIN:VCARD\r\nVERSION:2.2\r\nFN:John Doe\r\nEND:VCARD\r\n",
            [
                'Only vcard version 4.0 (RFC6350), version 3.0 (RFC2426) or version 2.1 (icm-vcard-2.1) are supported.',
            ],
            "BEGIN:VCARD\r\nVERSION:4.0\r\nFN:John Doe\r\nEND:VCARD\r\n",
        ],

        // No FN
        [
            "BEGIN:VCARD\r\nVERSION:4.0\r\nEND:VCARD\r\n",
            [
                'The FN property must appear in the VCARD component exactly 1 time',
            ],
            "BEGIN:VCARD\r\nVERSION:4.0\r\nEND:VCARD\r\n"
        ],

        // No FN, N fallback
        [
            "BEGIN:VCARD\r\nVERSION:4.0\r\nN:Doe;John;;;;;\r\nEND:VCARD\r\n",
            [
                'The FN property must appear in the VCARD component exactly 1 time',
            ],
            "BEGIN:VCARD\r\nVERSION:4.0\r\nN:Doe;John;;;;;\r\nFN:John Doe\r\nEND:VCARD\r\n",
        ],

        // No FN, N fallback, no first name
        [
            "BEGIN:VCARD\r\nVERSION:4.0\r\nN:Doe;;;;;;\r\nEND:VCARD\r\n",
            [
                'The FN property must appear in the VCARD component exactly 1 time',
            ],
            "BEGIN:VCARD\r\nVERSION:4.0\r\nN:Doe;;;;;;\r\nFN:Doe\r\nEND:VCARD\r\n",
        ],

        // No FN, ORG fallback
        [
            "BEGIN:VCARD\r\nVERSION:4.0\r\nORG:Acme Co.\r\nEND:VCARD\r\n",
            [
                'The FN property must appear in the VCARD component exactly 1 time',
            ],
            "BEGIN:VCARD\r\nVERSION:4.0\r\nORG:Acme Co.\r\nFN:Acme Co.\r\nEND:VCARD\r\n",
        ],

        // WITH PARAMS
        [
            "BEGIN:VCARD\r\nVERSION:4.0\r\nN:Doe;;;;;;\r\nFN:Doe\r\n" +
            "MAIL;TYPE=HOME;PREF:aenario@gmail.com\r\nEND:VCARD\r\n",
            [],
            "BEGIN:VCARD\r\nVERSION:4.0\r\nN:Doe;;;;;;\r\nFN:Doe\r\n" +
            "MAIL;TYPE=HOME;PREF:aenario@gmail.com\r\nEND:VCARD\r\n"
        ]
    ];

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
