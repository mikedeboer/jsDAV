var arango = require("arango");

/* Example: getConnection("http://127.0.0.1:8529/users",clbk); */
exports.getConnection = function(connStr, callback) {
    try {
    	callback(null,new arango.Connection(connStr));
    } catch (err) {
    	callback(err);
    }
};