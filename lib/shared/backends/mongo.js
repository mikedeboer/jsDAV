/*
 * @package jsDAV
 * @subpackage shared
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @author Wouter Vroege <wouter AT woutervroege DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
exports.getConnection = function(options, callback) {
    var MongoClient = require("mongodb").MongoClient,
        options = options || {},
        connURL = "mongodb://";

    if (options.username && options.password)
        connURL += options.username + ":" + options.password + "@" + options.host + ":" + options.port + "/" + options.db;
    else
        connURL += options.host + ":" + options.port + "/" + options.db;

    MongoClient.connect(connURL, function(err, db) {
        if (err)
            return callback(err);
        callback(null, db);
    });
};
