/*
 * @package jsDAV
 * @subpackage VObject
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var Base = require("../shared/base");

/**
 * Base class for all nodes
 */
var jsVObject_Node = module.exports = Base.extend({
    /**
     * The following constants are used by the validate() method.
     */
    REPAIR: 1,

    /**
     * Turns the object back into a serialized blob.
     *
     * @return string
     */
    serialize: function() {},

    /**
     * A link to the parent node
     *
     * @var Node
     */
    parent: null,

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
        return [];
    }
});
