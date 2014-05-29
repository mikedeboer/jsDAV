/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax.org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
var Http = require("http");
var Url = require("url");
var Dbox = require("dbox");
var jsDAV = require("./../lib/jsdav");

jsDAV.debugMode = true;

var creds = require("./credentials").dropbox;

var appData = creds.app;
var app = Dbox.app(appData);

// replace the following with:
// var tokens, access_token;
// to generate new token pairs.
var tokens = creds.tokens;
var access_token = creds.access_token;

function next() {
    console.log("creating jsDAV server with dropbox tokens:", access_token);
    jsDAV.createServer({
        type: "dropbox",
        app_key: appData.app_key,
        app_secret: appData.app_secret,
        access_token: access_token
    }, 8000);
}

Http.createServer(function(req, res) {
    var parsedUrl = Url.parse(req.url, true);
    if (parsedUrl.path == "/") {
        if (!tokens) {
            app.requesttoken(function(status, request_token){
                tokens = request_token;
                res.writeHead(200, {"content-type": "text/plain"});
                res.end(JSON.stringify(tokens) + "\n\n\n" +
                    "Go to " + tokens.authorize_url);
            });
        }
        else if (!access_token) {
            // we continue and generate an access token
            app.accesstoken(tokens, function(status, access) {
                console.log("Got access token: ", access);
                access_token = access;
                var client = app.client(access_token);
                client.account(function(status, reply){
                    res.writeHead(200, {"content-type": "text/plain"});
                    res.end(JSON.stringify(reply));
                    next();
                });
            });
        }
        // all prerequisites are available!
        else {
            res.writeHead(200, {"content-type": "text/plain"});
            res.end("OK");
            next();
        }
    }
    else {
        res.writeHead(404, {"content-type": "text/plain"});
        res.end("Not Found.");
    }
}).listen(8080, function() {
    console.log("Browse to http://localhost:8080/ to get started!");
});
