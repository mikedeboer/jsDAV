/*
 * @package jsDAV
 * @subpackage shared
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @author Wouter Vroege <wouter AT woutervroege DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
exports.getConnection = function(options, callback) {
    options = options || {};
    var mongo = require("mongodb");
    var server = new mongo.Server(options.host || "localhost", options.port || 27017, {
        auto_reconnect: true
    });
    var db = new mongo.Db(options.db || "jsdav", server, {
        safe: true
    });
    db.open(function (err, db) {
        if (err)
            return callback(err)

        if (options.username && options.password) {
            db.authenticate(options.username, options.password, function(err) {
                if (err)
                    return callback(err)
                callback(null, db);
            });
        }
        else
            callback(null, db);
    });
};
