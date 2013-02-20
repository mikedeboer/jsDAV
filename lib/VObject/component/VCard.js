/*
 * @package jsDAV
 * @subpackage VObject
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsVObject_Component = require("./../component");

/**
 * The VCard component
 *
 * This component represents the BEGIN:VCARD and END:VCARD found in every
 * vcard.
 */
var jsVObject_Component_VCard = module.exports = jsVObject_Component.extend({
    /**
     * VCards with version 2.1, 3.0 and 4.0 are found.
     *
     * If the VCARD doesn't know its version, 4.0 is assumed.
     */
    DEFAULT_VERSION: "4.0",

    /**
     * Validates the node for correctness.
     *
     * The following options are supported:
     *   - Node::REPAIR - If something is broken, and automatic repair may
     *                    be attempted.
     *
     * An array is returned with warnings.
     *
     * Every item in the array has the following properties:
     *    * level - (number between 1 and 3 with severity information)
     *    * message - (human readable message)
     *    * node - (reference to the offending node)
     *
     * @param {Number} options
     * @return array
     */
    validate: function(options) {
        options = options || 0;
        var warnings = [];

        var version = this.select("VERSION");
        if (version.length !== 1) {
            warnings.push({
                "level": 1,
                "message": "The VERSION property must appear in the VCARD component exactly 1 time",
                "node": this
            });
            if (options & this.REPAIR)
                this.set("VERSION", this.DEFAULT_VERSION);
        }
        else {
            version = this.get("VERSION").toString();
            if (version != "2.1" && version != "3.0" && version != "4.0") {
                warnings.push({
                    "level": 1,
                    "message": "Only vcard version 4.0 (RFC6350), version 3.0 (RFC2426) or version 2.1 (icm-vcard-2.1) are supported.",
                    "node": this
                });
                if (options & this.REPAIR)
                    this.set("VERSION", this.DEFAULT_VERSION);
            }
        }
        
        version = this.select("FN");
        if (version.length !== 1) {
            warnings.push({
                "level": 1,
                "message": "The FN property must appear in the VCARD component exactly 1 time",
                "node": this
            });
            if ((options & this.REPAIR) && version.length === 0) {
                // We're going to try to see if we can use the contents of the
                // N property.
                var n = this.get("N");
                if (n) {
                    var value = n.toString().split(";");
                    if (value[0] && value[1])
                        this.set("FN", value[1] + " " + value[0]);
                    else
                        this.set("FN", value[0]);
                }
                // Otherwise, the ORG property may work
                else if (this.get("ORG")) {
                    this.set("FN", this.get("ORG").toString());
                }
            }
        }

        return jsVObject_Component.validate.call(this, options).concat(warnings);
    }
});
