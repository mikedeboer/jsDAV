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
        if(str[str.length-1] == "Z"){
            return moment.utc(str.substring(0, str.length-1), "YYYYMMDDTHHmm00").local()
        }else{
            return moment(str, "YYYYMMDDTHHmm00");
        }
    },

    parse: function(str, reftz) {
        if(str[str.length-1] == "Z"){
            return moment.utc(str.substring(0, str.length-1), "YYYYMMDDTHHmm00").local()
        }else{
            return moment(str, "YYYYMMDDTHHmm00");
        }
    }

};