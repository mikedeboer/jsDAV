"use strict";

var Http = require("http");
var Async = require("./../node_modules/asyncjs");

var options = {
    host: "localhost",
    port: 8000,
    method: "REPORT",
    path: "/"
};

Async.range(1, 1000)
    .each(function(num) {
        var req = Http.request(options, function(res) {
            if (res.statusCode != 207)
                return next("Invalid status code! " + res.statusCode);

            console.log("[" + num + "] status: " + res.statusCode);
            //console.log("[" + num + "] headers: " + JSON.stringify(res.headers));
            res.setEncoding("utf8");
            res.on("data", function(chunk) {
                console.log("[" + num + "] body: " + chunk);
            });
            
            res.on("end", function() {
                //next();
            });
        });
        
        req.on("error", function(e) {
            console.log("problem with request: " + e.message);
        });
        
        // write data to request body
        req.write('<?xml version="1.0" encoding="utf-8" ?>\n');
        req.write('<D:filelist xmlns:D="DAV:"></D:filelist>');
        req.end();
    })
    .end(function(err) {
        console.log("DONE");
    });
