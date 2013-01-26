/*
 * @package jsDAV
 * @subpackage CardDAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_iCollection = require("./../../DAV/interfaces/iCollection");

/**
 * AddressBook interface
 *
 * Implement this interface to allow a node to be recognized as an addressbook.
 */
var jsCardDAV_iAddressBook = module.exports = jsDAV_iCollection.extend({
    // empty.
});
