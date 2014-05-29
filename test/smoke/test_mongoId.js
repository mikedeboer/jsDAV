var mongo = require('mongodb'),
	server = new mongo.Server('localhost', 27017, {auto_reconnect : true}),
	db = new mongo.Db('testjs', server, {safe:true}),
    BSON = mongo.BSONPure;

db.open(function() {
 
    db.collection("notes").update(
        {_id: "5128addc99f186968ef971af"},
        {$set: {content: "testje5"}}, function(err) {
    })
       
    db.collection("notes").findOne({_id: new BSON.ObjectID("5128addc99f186968ef971af")}, function(err, doc) {
        console.log(doc);
    })
      
      
})
