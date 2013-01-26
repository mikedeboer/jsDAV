/*
 * @package jsDAV
 * @subpackage CardDAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_iFile = require("./../../DAV/interfaces/iFile");

/**
 * Card interface
 *
 * Extend the ICard interface to allow your custom nodes to be picked up as
 * 'Cards'.
 */
var jsCardDAV_iCard = module.exports = jsDAV_iFile.extend({
    // empty.
});
