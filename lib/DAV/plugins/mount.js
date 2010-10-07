/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
var jsDAV              = require("./../../jsdav"),
    jsDAV_ServerPlugin = require("./../plugin").jsDAV_ServerPlugin,

    Exc  = require("./../exceptions"),
    Util = require("./../util");

function jsDAV_Mount_Plugin(handler) {
    this.handler = handler;
    this.initialize();
}

(function() {
    // todo
}).call(jsDAV_Mount_Plugin.prototype = new jsDAV_ServerPlugin());

module.exports = jsDAV_Mount_Plugin;
