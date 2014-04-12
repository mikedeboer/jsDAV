/*
 * @package jsDAV
 * @subpackage CalDAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

exports.init = function(redis, skipInit, callback) {
    if (skipInit)
        return callback();

    redis.multi([
        ["FLUSHDB"],
        // create user admin. NOTE: if you change the realm to something other than 'jsDAV', 
        // you need to change the hash below here to: md5("<username>:<realm>:<password>").
        ["SET", "users/admin", "6838d8a7454372f68a6abffbdb58911c"],
        // create the initial ACL rules for user 'admin'
        ["HMSET", "principals/principals/admin", "email", "admin@example.org", "displayname", "Administrator"],
        ["HMSET", "principals/principals/admin/calendar-proxy-read", "email", "", "displayname", ""],
        ["HMSET", "principals/principals/admin/calendar-proxy-write", "email", "", "displayname", ""],
        // create the first addressbook
        ["SET", "calendars/ID", "1"],
        ["HMSET", "calendars/1", "principaluri", "principals/admin", "displayname", "default addressbook", "uri", "default", "description", "", "ctag", "1"],
        ["HMSET", "calendars/principalUri", "principals/admin", "[1]"]
    ]).exec(callback);
};
