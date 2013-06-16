var getConnectionString = exports.getConnectionString = function(options) {
  var auth;
  if(options.username) {
    auth = options.username + ':' + (options.password || '') + '@';
  }
  else {
    auth = '';
  }

  return 'postgres://' 
            + auth 
            + (options.host || "localhost") 
            + (options.port ? ':' + options.port : '')
            + '/' + (options.db || "jsdav");
}

exports.getConnection = function(options, callback) {
  options = options || {};
  var pg = require("pg");

  var con = getConnectionString(options);
  var client = new pg.Client(con);

  client.connect(function(err) {
    if(err) {
      callback(err);
    }
    else {
      callback(null, client);
    }
  });
};
