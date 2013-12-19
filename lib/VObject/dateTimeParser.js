/*
 * @package jsDAV
 * @subpackage VObject
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Oleg Elifantiev <oleg@elifantiev.ru>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var moment = require('moment');

var jsVObject_DateTimeParser = module.exports = {

    parseDateTime: function(str) {
        // TODO YYYYMMDDTHHmm00\Z
        // TODO YYYYMMDDTHHmm00\ZZZ
        return moment(str, "YYYYMMDDTHHmm00");
    },

    parse: function(str, reftz) {
        return moment(str);
        // TODO implemet
    }

};