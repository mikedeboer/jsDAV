/*
 * @package jsDAV
 * @subpackage CardDAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsCardDAV_iAddressBook = require("./iAddressBook");

/**
 * iDirectory interface
 *
 * Implement this interface to have an addressbook marked as a 'directory'. A
 * directory is an (often) global addressbook.
 *
 * A full description can be found in the IETF draft:
 *   - draft-daboo-carddav-directory-gateway
 */
var jsCardDAV_iDirectory = module.exports = jsCardDAV_iAddressBook.extend({
    // empty.
});
