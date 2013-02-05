/*
 * @package jsDAV
 * @subpackage shared
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var Redis = require("redis");

exports.fromMultiBulk = function(data) {
    if (!data)
        return [];

    if (!Array.isArray(data))
        return [data.toString()];

    return data.map(function(buffer) {
        if (!buffer)
            return "";
        else if (Array.isArray(buffer))
            return exports.fromMultiBulk(buffer);
        else
            return buffer.toString();
    });
};

exports.redisConnection = function(options) {
    options = options || {};
    var client = Redis.createClient(options.port, options.host, options);

    if (options.password)
        client.auth(options.password);
        
    if (typeof options.index == "number")
        client.select(options.index);

    return client;
};
