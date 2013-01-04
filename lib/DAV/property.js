/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var Base = require("./../shared/base");

/**
 * Abstract property class
 *
 * Extend this class to create custom complex properties
 */
var jsDAV_Property = module.exports = Base.extend({
    serialize: function(handler, prop) {},

    unserialize: function(){
        return null;
    }
});
