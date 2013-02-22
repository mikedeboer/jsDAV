/*
 * @package jsDAV
 * @subpackage shared
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

exports.getConnection = function(options) {
    options = options || {};
    var mongo = require("mongodb"),
    	server = new mongo.Server('localhost', 27017, {auto_reconnect : true}),
    	db = new mongo.Db('jsdav', server, {safe:true});

    	db.open(function(err, db) {
    		if(err)
    			throw err;
    		else
    			return db;
    	})

    return client;
};
