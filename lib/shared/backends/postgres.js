/*
 * @package jsDAV
 * @subpackage shared
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Daniel Laxar
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var getConnectionString = exports.getConnectionString = function (options) {
    var auth = "";
    if (options.username)
        auth = options.username + ":" + (options.password || "") + "@";

    return "postgres://" + auth +
        (options.host || "localhost") +
        (options.port ? ':' + options.port : "") +
        "/" + (options.db || "jsdav");
}

exports.getConnection = function (options, callback) {
    options = options || {};
    var pg = require("pg");

    var con = getConnectionString(options);
    var client = new pg.Client(con);

    client.connect(function(err) {
        if (err)
            return callback(err);
        callback(null, client);
    });
};
