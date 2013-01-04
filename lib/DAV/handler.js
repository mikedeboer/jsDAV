/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

// DAV classes used directly by the Handler object
var jsDAV = require("./../jsdav");
var jsDAV_Server = require("./server");
var jsDAV_Property_Response = require("./property/response");
var jsDAV_Property_GetLastModified = require("./property/getLastModified");
var jsDAV_Property_ResourceType = require("./property/resourceType");
var jsDAV_Property_SupportedReportSet = require("./property/supportedReportSet");
// interfaces to check for:
var jsDAV_iFile = require("./interfaces/iFile");
var jsDAV_iCollection = require("./interfaces/iCollection");
var jsDAV_iExtendedCollection = require("./interfaces/iExtendedCollection")
var jsDAV_iQuota = require("./interfaces/iQuota");
var jsDAV_iProperties = require("./interfaces/iProperties");

var Url = require("url");
var Fs = require("fs");
var Path = require("path");
var Exc = require("./../shared/exceptions");
var Util = require("./../shared/util");
var Async = require("asyncjs");
var Formidable = require("formidable");

var requestCounter = 0;

/**
 * Called when an http request comes in, pass it on to invoke and handle any
 * exceptions that might be thrown
 *
 * @param {jsDav_Server}   server
 * @param {ServerRequest}  req
 * @param {ServerResponse} resp
 * @return {jsDAV_Handler}
 */
var jsDAV_Handler = module.exports = function(server, req, resp) {
    this.server       = server;
    this.httpRequest  = Util.streamBuffer(req);
    this.httpResponse = resp;
    this.plugins      = {};
    this.nodeCache    = {};

    for (var plugin in server.plugins) {
        if (typeof server.plugins[plugin] != "object")
            continue;
        this.plugins[plugin] = server.plugins[plugin].new(this);
    }

    try {
        this.invoke();
    }
    catch (ex) {
        this.handleError(ex);
    }
};

/**
 * Inifinity is used for some request supporting the HTTP Depth header and indicates
 * that the operation should traverse the entire tree
 */
exports.DEPTH_INFINITY = -1;

/**
 * Nodes that are files, should have this as the type property
 */
exports.NODE_FILE      = 1;

/**
 * Nodes that are directories, should use this value as the type property
 */
exports.NODE_DIRECTORY = 2;

exports.PROP_SET       = 1;
exports.PROP_REMOVE    = 2;

exports.STATUS_MAP     = {
    "100": "Continue",
    "101": "Switching Protocols",
    "200": "Ok",
    "201": "Created",
    "202": "Accepted",
    "203": "Non-Authorative Information",
    "204": "No Content",
    "205": "Reset Content",
    "206": "Partial Content",
    "207": "Multi-Status", // RFC 4918
    "208": "Already Reported", // RFC 5842
    "300": "Multiple Choices",
    "301": "Moved Permanently",
    "302": "Found",
    "303": "See Other",
    "304": "Not Modified",
    "305": "Use Proxy",
    "307": "Temporary Redirect",
    "400": "Bad request",
    "401": "Unauthorized",
    "402": "Payment Required",
    "403": "Forbidden",
    "404": "Not Found",
    "405": "Method Not Allowed",
    "406": "Not Acceptable",
    "407": "Proxy Authentication Required",
    "408": "Request Timeout",
    "409": "Conflict",
    "410": "Gone",
    "411": "Length Required",
    "412": "Precondition failed",
    "413": "Request Entity Too Large",
    "414": "Request-URI Too Long",
    "415": "Unsupported Media Type",
    "416": "Requested Range Not Satisfiable",
    "417": "Expectation Failed",
    "418": "I'm a teapot", // RFC 2324
    "422": "Unprocessable Entity", // RFC 4918
    "423": "Locked", // RFC 4918
    "424": "Failed Dependency", // RFC 4918
    "500": "Internal Server Error",
    "501": "Not Implemented",
    "502": "Bad Gateway",
    "503": "Service Unavailable",
    "504": "Gateway Timeout",
    "505": "HTTP Version not supported",
    "507": "Unsufficient Storage", // RFC 4918
    "508": "Loop Detected" // RFC 5842
};

/**
 * XML namespace for all jsDAV related elements
 */
exports.NS_AJAXORG = "http://ajax.org/2005/aml";

(function() {
    /**
     * httpResponse
     *
     * @var HTTP_Response
     */
    this.httpResponse =

    /**
     * httpRequest
     *
     * @var HTTP_Request
     */
    this.httpRequest = null;

    /**
     * This is a default list of namespaces.
     *
     * If you are defining your own custom namespace, add it here to reduce
     * bandwidth and improve legibility of xml bodies.
     *
     * @var array
     */
    this.xmlNamespaces = {
        "DAV:": "d",
        "http://ajax.org/2005/aml": "a"
    };

    /**
     * The propertymap can be used to map properties from
     * requests to property classes.
     *
     * @var array
     */
    this.propertyMap = {};

    this.protectedProperties = [
        // RFC4918
        "{DAV:}getcontentlength",
        "{DAV:}getetag",
        "{DAV:}getlastmodified",
        "{DAV:}lockdiscovery",
        "{DAV:}resourcetype",
        "{DAV:}supportedlock",

        // RFC4331
        "{DAV:}quota-available-bytes",
        "{DAV:}quota-used-bytes",

        // RFC3744
        "{DAV:}alternate-URI-set",
        "{DAV:}principal-URL",
        "{DAV:}group-membership",
        "{DAV:}supported-privilege-set",
        "{DAV:}current-user-privilege-set",
        "{DAV:}acl",
        "{DAV:}acl-restrictions",
        "{DAV:}inherited-acl-set",
        "{DAV:}principal-collection-set",

        // RFC5397
        "{DAV:}current-user-principal"
    ];

    var internalMethods = {
        "OPTIONS":1,
        "GET":1,
        "HEAD":1,
        "DELETE":1,
        "PROPFIND":1,
        "MKCOL":1,
        "PUT":1,
        "PROPPATCH":1,
        "COPY":1,
        "MOVE":1,
        "REPORT":1
    };

    /**
     * Handles a http request, and execute a method based on its name
     *
     * @return void
     */
    this.invoke = function() {
        var method = this.httpRequest.method.toUpperCase(),
            self  = this;
        if (jsDAV.debugMode) {
            this.id = ++requestCounter;
            Util.log("{" + this.id + "}", method, this.httpRequest.url);
            Util.log("{" + this.id + "}", this.httpRequest.headers);
            var wh = this.httpResponse.writeHead,
                we = this.httpResponse.end;
            this.httpResponse.writeHead = function(code, headers) {
                Util.log("{" + self.id + "}", code, headers);
                this.writeHead = wh;
                this.writeHead(code, headers);
            };
            this.httpResponse.end = function(content) {
                Util.log("{" + self.id + "}", "'" + (content || "") + "'");
                this.end = we;
                this.end(content);
            };
        }

        this.dispatchEvent("beforeMethod", method, function(stop) {
            if (stop === true)
                return;
            if (stop)
                return self.handleError(stop);
            // Make sure this is a HTTP method we support
            if (internalMethods[method]) {
                self["http" + method.charAt(0) + method.toLowerCase().substr(1)]();
            }
            else {
                self.dispatchEvent("unknownMethod", method, function(stop) {
                    if (stop === true)
                        return;
                    // Unsupported method
                    self.handleError(new Exc.jsDAV_Exception_NotImplemented());
                });
            }
        });
    };

    /**
     * Centralized error and exception handler, which constructs a proper WebDAV
     * 500 server error, or different depending on the error object implementation
     * and/ or extensions.
     *
     * @param  {Error} e Error string or Exception object
     * @return {void}
     */
    this.handleError = function(e) {
        //if (jsDAV.debugMode)
        //    console.trace();
        if (e === true)
            return; // plugins should return TRUE to prevent error reporting.
        if (typeof e == "string")
            e = new Exc.jsDAV_Exception(e);
        var xml = '<?xml version="1.0" encoding="utf-8"?>\n'
                + '<d:error xmlns:d="DAV:" xmlns:a="' + exports.NS_AJAXORG + '">\n'
                + '    <a:exception>' + (e.type || e.toString()) + '</a:exception>\n'
                + '    <a:message>'   + e.message + '</a:message>\n';
        if (this.server.debugExceptions) {
            xml += '<a:file>' + (e.filename || "") + '</a:file>\n'
                +  '<a:line>' + (e.line || "") + '</a:line>\n';
        }
        xml += '<a:jsdav-version>' + jsDAV_Server.VERSION + '</a:jsdav-version>\n';

        var code = 500;
        var self = this;
        if (e.type && e.type.indexOf("jsDAV_Exception") === 0) {
            code = e.code;
            xml  = e.serialize(this, xml);
            e.getHTTPHeaders(this, function(err, h) {
                afterHeaders(h);
            });
        }
        else {
            afterHeaders({});
        }

        function afterHeaders(headers) {
            headers["Content-Type"] = "application/xml; charset=utf-8";

            self.httpResponse.writeHead(code, headers);
            self.httpResponse.end(xml + '</d:error>', "utf-8");

            if (jsDAV.debugMode) {
                Util.log(e, "error");
                //throw e; // DEBUGGING!
            }
        }
    };

    /**
     * Caching version of jsDAV_Server#tree#getNodeForPath(), to make node lookups
     * during the same request (the scope of a handler instance) more cheap.
     *
     * @param {String} path
     * @param {Function} cbgetnodefp
     * @returns {void}
     */
    this.getNodeForPath = function(path, cbgetnodefp) {
        if (this.nodeCache[path])
            return cbgetnodefp(null, this.nodeCache[path]);

        var self = this;
        this.server.tree.getNodeForPath(path, function(err, node) {
            if (err)
                return cbgetnodefp(err);
            self.nodeCache[path] = node;
            cbgetnodefp(null, node);
        });
    };

    /**
     * HTTP OPTIONS
     *
     * @return {void}
     * @throws {Error}
     */
    this.httpOptions = function() {
        var uri  = this.getRequestUri();
        var self = this;

        this.getAllowedMethods(uri, function(err, methods) {
            if (!Util.empty(err))
                return self.handleError(err);
            var headers = {
                "Allow": methods.join(",").toUpperCase(),
                "MS-Author-Via"   : "DAV",
                "Accept-Ranges"   : "bytes",
                "X-jsDAV-Version" : jsDAV_Server.VERSION,
                "Content-Length"  : 0
            };
            var features = ["1", "3", "extended-mkcol"];

            for (var plugin in self.plugins) {
                if (!self.plugins[plugin].getFeatures)
                    Util.log("method getFeatures() NOT implemented for plugin " + plugin, "error");
                else
                    features = features.concat(self.plugins[plugin].getFeatures());
            }

            headers["DAV"] = features.join(",");

            self.httpResponse.writeHead(200, headers);
            self.httpResponse.end();
        });
    };

    /**
     * HTTP GET
     *
     * This method simply fetches the contents of a uri, like normal
     *
     * @return {void}
     * @throws {Error}
     */
    this.httpGet = function() {
        var node;
        var uri  = this.getRequestUri();
        var self = this;

        this.checkPreconditions(true, function(err, redirected) {
            if (!Util.empty(err))
                return self.handleError(err);
            if (redirected)
                return;
            self.getNodeForPath(uri, function(err, n) {
                if (!Util.empty(err))
                    return self.handleError(err);
                node = n;
                afterCheck();
            });
        });

        function afterCheck() {
            if (!node.hasFeature(jsDAV_iFile)) {
                return self.handleError(new Exc.jsDAV_Exception_NotImplemented(
                    "GET is only implemented on File objects"));
            }

            var hasStream = !!node.getStream;

            self.getHTTPHeaders(uri, function(err, httpHeaders) {
                if (!Util.empty(err))
                    return self.handleError(err);
                var nodeSize = null;
                // ContentType needs to get a default, because many webservers
                // will otherwise default to text/html, and we don't want this
                // for security reasons.
                if (!httpHeaders["content-type"])
                    httpHeaders["content-type"] = "application/octet-stream";

                if (httpHeaders["content-length"]) {
                    nodeSize = httpHeaders["content-length"];
                    // Need to unset Content-Length, because we'll handle that
                    // during figuring out the range
                    delete httpHeaders["content-length"];
                }

                var range             = self.getHTTPRange();
                var ifRange           = self.httpRequest.headers["if-range"];
                var ignoreRangeHeader = false;

                // If ifRange is set, and range is specified, we first need
                // to check the precondition.
                if (nodeSize && range && ifRange) {
                    // if IfRange is parsable as a date we'll treat it as a
                    // DateTime otherwise, we must treat it as an etag.
                    try {
                        var ifRangeDate = new Date(ifRange);

                        // It's a date. We must check if the entity is modified
                        // since the specified date.
                        if (!httpHeaders["last-modified"]) {
                            ignoreRangeHeader = true;
                        }
                        else {
                            var modified = new Date(httpHeaders["last-modified"]);
                            if (modified > ifRangeDate)
                                ignoreRangeHeader = true;
                        }
                    }
                    catch (ex) {
                        // It's an entity. We can do a simple comparison.
                        if (!httpHeaders["etag"])
                            ignoreRangeHeader = true;
                        else if (httpHeaders["etag"] !== ifRange)
                            ignoreRangeHeader = true;
                    }
                }

                // We're only going to support HTTP ranges if the backend
                // provided a filesize
                if (!ignoreRangeHeader && nodeSize && range) {
                    // Determining the exact byte offsets
                    var start, end;
                    if (range[0] !== null) {
                        start = range[0];
                        // the browser/ client sends 'end' offsets as factor of nodeSize - 1,
                        // so we need to correct it, because NodeJS streams byte offsets
                        // are inclusive
                        end   = range[1] !== null ? range[1] + 1 : nodeSize;
                        if (start > nodeSize) {
                            return self.handleError(new Exc.jsDAV_Exception_RequestedRangeNotSatisfiable(
                                "The start offset (" + range[0] + ") exceeded the size of the entity ("
                                + nodeSize + ")")
                            );
                        }

                        if (end < start) {
                            return self.handleError(new Exc.jsDAV_Exception_RequestedRangeNotSatisfiable(
                                "The end offset (" + range[1] + ") is lower than the start offset ("
                                + range[0] + ")")
                            );
                        }
                        if (end > nodeSize)
                            end = nodeSize;

                    }
                    else {
                        start = nodeSize - range[1];
                        end   = nodeSize;
                        if (start < 0)
                            start = 0;
                    }

                    var offlen = end - start + 1;
                    // Prevent buffer error
                    // https://github.com/joyent/node/blob/v0.4.5/lib/buffer.js#L337
                    if (offlen < start)
                        start = offlen;

                    // report a different end offset, corrected by 1:
                    var clientEnd = end > 0 ? end - 1 : end;
                    httpHeaders["content-length"] = offlen;
                    httpHeaders["content-range"]  = "bytes " + start + "-" + clientEnd + "/" + nodeSize;

                    if (hasStream) {
                        var writeStreamingHeader = function () {
                            self.httpResponse.writeHead(206, httpHeaders);
                        };

                        node.getStream(start, offlen, function(err, data) {
                            if (err) {
                                if (!writeStreamingHeader) {
                                    self.httpResponse.end();
                                    console.error("jsDAV GET error", err);
                                }
                                else {
                                    self.handleError(err);
                                }
                                return;
                            }

                            // write header on first incoming buffer
                            if (writeStreamingHeader) {
                                writeStreamingHeader();
                                writeStreamingHeader = null;
                            }

                            if (!data)
                                return self.httpResponse.end();

                            self.httpResponse.write(data);
                        });
                    }
                    else {
                        node.get(function(err, body) {
                            if (!Util.empty(err))
                                return self.handleError(err);

                            // New read/write stream
                            var newStream = new Buffer(offlen);
                            body.copy(newStream, 0, start, offlen);

                            self.httpResponse.writeHead(206, httpHeaders);
                            self.httpResponse.end(newStream);
                        });
                    }
                }
                else {
                    var since        = self.httpRequest.headers["if-modified-since"];
                    var oldEtag      = self.httpRequest.headers["if-none-match"];
                    var lastModified = httpHeaders["last-modified"];
                    var etag         = httpHeaders["etag"];
                    since = since && Date.parse(since).valueOf();
                    lastModified = lastModified && Date.parse(lastModified).valueOf();
                    // If there is no match, then move on.
                    if (!((since && lastModified === since) || (etag && oldEtag === etag))) {
                        if (nodeSize)
                            httpHeaders["content-length"] = nodeSize;
                        if (hasStream) {
                            var writeStreamingHeader = function () {
                                self.httpResponse.writeHead(200, httpHeaders);
                            };

                            // no start or end means: get all file contents.
                            node.getStream(null, null, function(err, data) {
                                if (err) {
                                    if (!writeStreamingHeader) {
                                        self.httpResponse.end();
                                        console.error("jsDAV GET error", err);
                                    }
                                    else {
                                        self.handleError(err);
                                    }
                                    return;
                                }

                                // write header on first incoming buffer
                                if (writeStreamingHeader) {
                                    writeStreamingHeader();
                                    writeStreamingHeader = null;
                                }

                                if (!data)
                                    return self.httpResponse.end();

                                self.httpResponse.write(data);
                            });
                        }
                        else {
                            node.get(function(err, body) {
                                if (!Util.empty(err))
                                    return self.handleError(err);

                                self.httpResponse.writeHead(200, httpHeaders);
                                self.httpResponse.end(body);
                            });
                        }
                    }
                    else {
                        // Filter out any Content based headers since there
                        // is no content.
                        var newHeaders = {};
                        Object.keys(httpHeaders).forEach(function(key) {
                            if (key.indexOf("content") < 0)
                                newHeaders[key] = httpHeaders[key];
                        });
                        self.httpResponse.writeHead(304, newHeaders);
                        self.httpResponse.end();
                    }
                }
            });
        }
    };

    /**
     * HTTP HEAD
     *
     * This method is normally used to take a peak at a url, and only get the
     * HTTP response headers, without the body.
     * This is used by clients to determine if a remote file was changed, so
     * they can use a local cached version, instead of downloading it again
     *
     * @return {void}
     * @throws {Error}
     */
    this.httpHead = function() {
        var uri   = this.getRequestUri(),
            self = this;

        this.getNodeForPath(uri, function(err, node) {
            if (!Util.empty(err))
                return self.handleError(err);
            /* This information is only collection for File objects.
             * Ideally we want to throw 405 Method Not Allowed for every
             * non-file, but MS Office does not like this
             */
            var headers = {};
            if (node.hasFeature(jsDAV_iFile)) {
                self.getHTTPHeaders(uri, function(err, headersFetched) {
                    if (!Util.empty(err))
                        return self.handleError(err);
                    headers = headersFetched;
                    if (!headers["content-type"])
                        headers["content-type"] = "application/octet-stream";
                    afterHeaders();
                });
            }
            else {
                afterHeaders();
            }

            function afterHeaders() {
                self.httpResponse.writeHead(200, headers);
                self.httpResponse.end();
            }
        });
    };

    /**
     * HTTP Delete
     *
     * The HTTP delete method, deletes a given uri
     *
     * @return {void}
     * @throws {Error}
     */
    this.httpDelete = function() {
        var uri  = this.getRequestUri();
        var self = this;

        this.getNodeForPath(uri, function(err, node) {
            if (!Util.empty(err))
                return self.handleError(err);

            self.dispatchEvent("beforeUnbind", uri, function(stop) {
                if (stop === true)
                    return;
                node["delete"](function(err) {
                    if (!Util.empty(err))
                        return self.handleError(err);
                    self.httpResponse.writeHead(204, {"content-length": "0"});
                    self.httpResponse.end();
                    self.dispatchEvent("afterDelete", uri);
                });
            });
        });
    };

    /**
     * WebDAV PROPFIND
     *
     * This WebDAV method requests information about an uri resource, or a list
     * of resources
     * If a client wants to receive the properties for a single resource it will
     * add an HTTP Depth: header with a 0 value.
     * If the value is 1, it means that it also expects a list of sub-resources
     * (e.g.: files in a directory)
     *
     * The request body contains an XML data structure that has a list of
     * properties the client understands.
     * The response body is also an xml document, containing information about
     * every uri resource and the requested properties
     *
     * It has to return a HTTP 207 Multi-status status code
     *
     * @throws {Error}
     */
    this.httpPropfind = function() {
        var self = this;
        this.getRequestBody("utf8", null, function(err, data) {
            if (!Util.empty(err))
                return self.handleError(err);
            //if (jsDAV.debugMode)
            //    Util.log("data received " + data);
            self.parsePropfindRequest(data, function(err, requestedProperties) {
                if (!Util.empty(err))
                    return self.handleError(err);
                var depth = self.getHTTPDepth(1);
                // The only two options for the depth of a propfind is 0 or 1
                if (depth !== 0)
                    depth = 1;

                // The requested path
                var path;
                try {
                    path = self.getRequestUri();
                }
                catch (ex) {
                    return self.handleError(ex);
                }
                //if (jsDAV.debugMode)
                //    Util.log("httpPropfind BEFORE getPropertiesForPath '" + path + "';", requestedProperties);
                self.getPropertiesForPath(path, requestedProperties, depth, function(err, newProperties) {
                    if (!Util.empty(err))
                        return self.handleError(err);
                    // This is a multi-status response
                    self.httpResponse.writeHead(207, {"content-type": "application/xml; charset=utf-8"});
                    self.httpResponse.end(self.generateMultiStatus(newProperties));
                });
            });
        });
    };

    /**
     * WebDAV PROPPATCH
     *
     * This method is called to update properties on a Node. The request is an
     * XML body with all the mutations.
     * In this XML body it is specified which properties should be set/updated
     * and/or deleted
     *
     * @return {void}
     */
    this.httpProppatch = function() {
        var self = this;
        this.getRequestBody("utf8", null, function(err, data) {
            if (!Util.empty(err))
                return self.handleError(err);
            //if (jsDAV.debugMode)
            //    Util.log("data received " + data);
            self.parseProppatchRequest(data, function(err, newProperties) {
                if (!Util.empty(err))
                    return self.handleError(err);
                self.updateProperties(self.getRequestUri(), newProperties, function(err, result) {
                    if (!Util.empty(err))
                        return self.handleError(err);
                    self.httpResponse.writeHead(207, {"content-type": "application/xml; charset=utf-8"});
                    self.httpResponse.end(self.generateMultiStatus(result));
                });
            });
        });
    };

    /**
     * HTTP PUT method
     *
     * This HTTP method updates a file, or creates a new one.
     * If a new resource was created, a 201 Created status code should be returned.
     * If an existing resource is updated, it's a 200 Ok
     *
     * @return {void}
     */
    this.httpPut = function() {
        var self = this;
        var uri  = this.getRequestUri();

        // First we'll do a check to see if the resource already exists
        this.getNodeForPath(uri, function(err, node) {
            if (!Util.empty(err)) {
                if (err instanceof Exc.jsDAV_Exception_FileNotFound) {
                    // If we got here, the resource didn't exist yet.
                    // `data` is set to `null` to use streamed write.
                    self.createFile(uri, null, "binary", function(err) {
                        if (!Util.empty(err))
                            return self.handleError(err);
                        self.httpResponse.writeHead(201, {"content-length": "0"});
                        self.httpResponse.end();
                        self.dispatchEvent("afterWriteContent", uri);
                    });
                }
                else {
                    return self.handleError(err);
                }
            }
            else {
                var hasStream = !!node.putStream;
                // Checking If-None-Match and related headers.
                self.checkPreconditions(false, function(err, redirected) {
                    if (!Util.empty(err))
                        return self.handleError(err);
                    if (redirected)
                        return false;
                    // If the node is a collection, we'll deny it
                    if (!node.hasFeature(jsDAV_iFile))
                        return self.handleError(new Exc.jsDAV_Exception_Conflict("PUT is not allowed on non-files."));

                    self.dispatchEvent("beforeWriteContent", uri, function(stop) {
                        if (stop === true)
                            return;

                        if (hasStream) {
                            node.putStream(self, "binary", afterPut);
                        }
                        else {
                            self.getRequestBody("binary", null, function(err, body) {
                                if (!Util.empty(err))
                                    return self.handleError(err);

                                node.put(body, "binary", afterPut);
                            });
                        }

                        function afterPut(err) {
                            if (!Util.empty(err))
                                return self.handleError(err);

                            self.httpResponse.writeHead(200, {"content-length": "0"});
                            self.httpResponse.end();
                            self.dispatchEvent("afterWriteContent", uri);
                        }
                    });
                });
            }
        });
    };

    /**
     * WebDAV MKCOL
     *
     * The MKCOL method is used to create a new collection (directory) on the server
     *
     * @return {void}
     */
    this.httpMkcol = function() {
        var resourceType;
        var properties = {};
        var self       = this;
        var req        = this.httpRequest;

        this.getRequestBody("utf8", null, function(err, requestBody) {
            if (!Util.empty(err))
                return self.handleError(err);

            if (requestBody) {
                var contentType = req.headers["content-type"];
                if (contentType.indexOf("application/xml") !== 0 && contentType.indexOf("text/xml") !== 0) {
                    // We must throw 415 for unsupported mkcol bodies
                    return self.handleError(new Exc.jsDAV_Exception_UnsupportedMediaType(
                        "The request body for the MKCOL request must have an xml Content-Type"));
                }

                Util.loadDOMDocument(requestBody, self.server.options.parser, function(err, dom) {
                    var firstChild = dom.firstChild;
                    if (Util.toClarkNotation(firstChild) !== "{DAV:}mkcol") {
                        // We must throw 415 for unsupport mkcol bodies
                        return self.handleError(new Exc.jsDAV_Exception_UnsupportedMediaType(
                            "The request body for the MKCOL request must be a {DAV:}mkcol request construct."));
                    }

                    var childNode;
                    var i = 0;
                    var c = firstChild.childNodes;
                    var l = c.length;
                    for (; i < l; ++i) {
                        childNode = c[i];
                        if (Util.toClarkNotation(childNode) !== "{DAV:}set")
                            continue;
                        properties = Util.extend(properties, Util.parseProperties(childNode, self.propertyMap));
                    }
                    if (!properties["{DAV:}resourcetype"]) {
                        return self.handleError(new Exc.jsDAV_Exception_BadRequest(
                            "The mkcol request must include a {DAV:}resourcetype property")
                        );
                    }

                    delete properties["{DAV:}resourcetype"];

                    resourceType = [];
                    // Need to parse out all the resourcetypes
                    var rtNode = firstChild.getElementsByTagNameNS("urn:DAV", "resourcetype")[0];
                    for (i = 0, c = rtNode.childNodes, l = c.length; i < l; ++i)
                        resourceType.push(Util.toClarkNotation(c[i]));

                    afterParse();
                });
            }
            else {
                resourceType = ["{DAV:}collection"];
                afterParse();
            }

            function afterParse() {
                try {
                    var uri = self.getRequestUri()
                }
                catch (ex) {
                    return self.handleError(ex);
                }
                self.createCollection(uri, resourceType, properties, function(err, result) {
                    if (!Util.empty(err))
                        return self.handleError(err);
                    if (result && result.length) {
                        self.httpResponse.writeHead(207, {"content-type": "application/xml; charset=utf-8"});
                        self.httpResponse.end(self.generateMultiStatus(result));
                    }
                    else {
                        self.httpResponse.writeHead(201, {"content-length": "0"});
                        self.httpResponse.end();
                    }
                });
            }
        });
    };

    /**
     * WebDAV HTTP MOVE method
     *
     * This method moves one uri to a different uri. A lot of the actual request
     * processing is done in getCopyMoveInfo
     *
     * @return {void}
     */
    this.httpMove = function() {
        var self = this;

        this.getCopyAndMoveInfo(function(err, moveInfo) {
            if (!Util.empty(err))
                return self.handleError(err);
            if (moveInfo["destinationExists"]) {
                self.dispatchEvent("beforeUnbind", moveInfo["destination"], function(stop) {
                    if (stop === true)
                        return false;
                    moveInfo["destinationNode"]["delete"](function(err) {
                        if (!Util.empty(err))
                            return self.handleError(err);
                        afterDelete();
                    });
                });
            }
            else {
                afterDelete();
            }

            function afterDelete() {
                self.dispatchEvent("beforeUnbind", moveInfo["source"], function(stop) {
                    if (stop === true)
                        return false;
                    self.dispatchEvent("beforeBind", moveInfo["destination"], function(stop) {
                        if (stop === true)
                            return false;
                        self.server.tree.move(moveInfo["source"], moveInfo["destination"], function(err) {
                            if (!Util.empty(err))
                                return self.handleError(err);

                            self.dispatchEvent("afterBind", moveInfo["destination"],
                                Path.join(self.server.tree.basePath, moveInfo["destination"]));
                            // If a resource was overwritten we should send a 204, otherwise a 201
                            self.httpResponse.writeHead(moveInfo["destinationExists"] ? 204 : 201,
                                {"content-length": "0"});
                            self.httpResponse.end();
                            self.dispatchEvent("afterMove", moveInfo["destination"]);
                        });
                    });
                });
            }
        });
    };

    /**
     * WebDAV HTTP COPY method
     *
     * This method copies one uri to a different uri, and works much like the MOVE request
     * A lot of the actual request processing is done in getCopyMoveInfo
     *
     * @return {void}
     */
    this.httpCopy = function() {
        var self = this;

        this.getCopyAndMoveInfo(function(err, copyInfo) {
            if (!Util.empty(err))
                return self.handleError(err);
            if (copyInfo["destinationExists"]) {
                self.dispatchEvent("beforeUnbind", copyInfo["destination"], function(stop) {
                    if (stop === true)
                        return false;
                    copyInfo["destinationNode"]["delete"](function(err) {
                        if (!Util.empty(err))
                            return self.handleError(err);
                        afterDelete();
                    });
                });
            }
            else {
                afterDelete();
            }

            function afterDelete() {
                self.dispatchEvent("beforeBind", copyInfo["destination"], function(stop) {
                    if (stop === true)
                        return false;
                    self.server.tree.copy(copyInfo["source"], copyInfo["destination"], function(err) {
                        if (!Util.empty(err))
                            return self.handleError(err);
                        self.dispatchEvent("afterBind", copyInfo["destination"],
                            Path.join(self.server.tree.basePath, copyInfo["destination"]));

                        // If a resource was overwritten we should send a 204, otherwise a 201
                        self.httpResponse.writeHead(copyInfo["destinationExists"] ? 204 : 201,
                            {"Content-Length": "0"});
                        self.httpResponse.end();
                        self.dispatchEvent("afterCopy", copyInfo["destination"]);
                    });
                });
            }
        });
    };

    /**
     * HTTP REPORT method implementation
     *
     * Although the REPORT method is not part of the standard WebDAV spec (it's from rfc3253)
     * It's used in a lot of extensions, so it made sense to implement it into the core.
     *
     * @return {void}
     */
    this.httpReport = function() {
        var self = this;
        this.getRequestBody("utf8", null, function(err, data) {
            Util.loadDOMDocument(data, self.server.options.parser, function(err, dom) {
                var reportName = Util.toClarkNotation(dom);
                self.dispatchEvent("report", reportName, dom, function(stop) {
                    if (stop !== true) {
                        // if dispatchEvent didn't return true, it means the report was not supported
                        return self.handleError(new Exc.jsDAV_Exception_ReportNotImplemented());
                    }
                });
            });
        });
    };

    /**
     * Returns an array with all the supported HTTP methods for a specific uri.
     *
     * @param  {String}   uri
     * @param  {Function} cbmethods Callback that is the return body of this function
     * @return {Array}
     */
    this.getAllowedMethods = function(uri, cbmethods) {
        var self   = this;
        var methods = [
            "OPTIONS",
            "GET",
            "HEAD",
            "DELETE",
            "PROPFIND",
            "PUT",
            "PROPPATCH",
            "COPY",
            "MOVE",
            "REPORT"
        ];

        // The MKCOL is only allowed on an unmapped uri
        this.getNodeForPath(uri, function(err, node) {
            if (!Util.empty(err))
                methods.push("MKCOL");

            // We're also checking if any of the plugins register any new methods
            for (var plugin in self.plugins) {
                if (!self.plugins[plugin].getHTTPMethods)
                    Util.log("method getHTTPMethods() NOT implemented for plugin " + plugin, "error");
                else
                    methods = methods.concat(self.plugins[plugin].getHTTPMethods(uri, node));
            }

            cbmethods(null, Util.makeUnique(methods));
        });
    };

    /**
     * Gets the uri for the request, keeping the base uri into consideration
     *
     * @return {String}
     * @throws {Error}
     */
    this.getRequestUri = function() {
        return this.calculateUri(this.httpRequest.url);
    };

    /**
     * Fetch the binary data for the HTTP request and return it to a callback OR
     * write it to a WritableStream instance.
     *
     * @param  {String} enc
     * @param  {WritableStream} [callback]
     * @param  {Function} callback
     * @return {void}
     */
    this.getRequestBody = function(enc, stream, cbreqbody) {
        if (!cbreqbody) {
            cbreqbody = stream;
            stream = null;
        }

        var ctype;
        var req      = this.httpRequest;
        var isStream = (!(ctype = req.headers["content-type"]) || !ctype.match(/(urlencoded|multipart)/i));

        // HACK: MacOSX Finder and NodeJS don't play nice together with files
        // that start with '._'
        //if (/\/\.[D_]{1}[^\/]+$/.test(req.url))
        //    return cbreqbody(null, "", cleanup);

        enc = (enc || "utf8").replace("-", "");
        if (enc == "raw")
            enc = "binary";
        if (req.$data) {
            return cbreqbody(req.$data.err || null, enc == "binary"
                ? req.$data
                : req.$data.toString(enc));
        }

        if (isStream) {
            var buff = [];
            var contentLength = req.headers["content-length"];
            var lengthCount = 0;
            var err;

            if (stream)
                stream.on("error", function(ex) { err = ex; });

            req.streambuffer.ondata(function(data) {
                lengthCount += data.length;
                if (stream && stream.writable)
                    stream.write(data);
                else
                    buff.push(data);
            });

            req.streambuffer.onend(function() {
                // TODO: content-length check and rollback...
                if (stream) {
                    if (err)
                        return cbreqbody(err);

                    stream.on("close", function() {
                        cbreqbody(err);
                    });
                    stream.end();
                }
                else {
                    buff = Util.concatBuffers(buff);
                    if (contentLength && parseInt(contentLength, 10) != buff.length) {
                        readDone(new Exc.jsDAV_Exception_BadRequest("Content-Length mismatch: Request Header claimed "
                            + contentLength + " bytes, but received " + buff.length + " bytes"), buff);
                    }
                    else
                        readDone(null, buff);
                }
            });
        }
        else {
            var form = new Formidable.IncomingForm();
            form.uploadDir = this.server.tmpDir;

            form.addListener("file", function(field, file) {
                // in the case of a streamed write, we can move the file to its
                // correct position right away:
                if (stream) {
                    stream.on("close", function() {
                        Fs.rename(file.path, stream.path, cbreqbody);
                    });
                    stream.end();
                }
                else {
                    Fs.readFile(file.path, function(err, data) {
                        readDone(err, data);
                        Fs.unlink(file.path);
                    });
                }
            });

            form.addListener("error", cbreqbody);

            form.parse(req);
        }

        function readDone(err, data) {
            req.$data = data;
            if (err)
                req.$data.err = err;
            cbreqbody(err, enc == "binary"
                ? req.$data
                : req.$data.toString(enc));
        }
    };

    /**
     * Calculates the uri for a request, making sure that the base uri is stripped out
     *
     * @param  {String} uri
     * @throws {jsDAV_Exception_Forbidden} A permission denied exception is thrown
     *         whenever there was an attempt to supply a uri outside of the base uri
     * @return {String}
     */
    this.calculateUri = function(uri) {
        if (uri.charAt(0) != "/" && uri.indexOf("://") > -1)
            uri = Url.parse(uri).pathname;
        else if (uri.indexOf("?") > -1)
            uri = Url.parse(uri).pathname;

        uri = uri.replace("//", "/");

        if (uri.indexOf(this.server.baseUri) === 0) {
            return Util.trim(decodeURIComponent(uri.substr(this.server.baseUri.length)), "/");
        }
        // A special case, if the baseUri was accessed without a trailing
        // slash, we'll accept it as well.
        else if (uri + "/" === this.server.baseUri) {
            return "";
        }
        else {
            throw new Exc.jsDAV_Exception_Forbidden("Requested uri (" + uri
                + ") is out of base uri (" + this.server.baseUri + ")");
        }
    };

    /**
     * This method checks the main HTTP preconditions.
     *
     * Currently these are:
     *   * If-Match
     *   * If-None-Match
     *   * If-Modified-Since
     *   * If-Unmodified-Since
     *
     * The method will return true if all preconditions are met
     * The method will return false, or throw an exception if preconditions
     * failed. If false is returned the operation should be aborted, and
     * the appropriate HTTP response headers are already set.
     *
     * Normally this method will throw 412 Precondition Failed for failures
     * related to If-None-Match, If-Match and If-Unmodified Since. It will
     * set the status to 304 Not Modified for If-Modified_since.
     *
     * If the handleAsGET argument is set to true, it will also return 304
     * Not Modified for failure of the If-None-Match precondition. This is the
     * desired behaviour for HTTP GET and HTTP HEAD requests.
     *
     * @param  {Boolean}  handleAsGET
     * @param  {Function} cbprecond   Callback that is the return body of this function
     * @return {void}
     */
    this.checkPreconditions = function(handleAsGET, cbprecond) {
        handleAsGET = handleAsGET || false;
        var uri, ifMatch, ifNoneMatch, ifModifiedSince, ifUnmodifiedSince;
        var node    = null;
        var lastMod = null;
        var etag    = null;
        var self    = this;

        try {
            uri = this.getRequestUri();
        }
        catch (ex) {
            return cbprecond(ex);
        }

        if (ifMatch = this.httpRequest.headers["if-match"]) {
            // If-Match contains an entity tag. Only if the entity-tag
            // matches we are allowed to make the request succeed.
            // If the entity-tag is '*' we are only allowed to make the
            // request succeed if a resource exists at that url.
            this.getNodeForPath(uri, function(err, n) {
                if (!Util.empty(err)) {
                    return cbprecond(new Exc.jsDAV_Exception_PreconditionFailed(
                        "An If-Match header was specified and the resource did not exist",
                        "If-Match"));
                }
                node = n;
                // Only need to check entity tags if they are not *
                if (ifMatch !== "*") {
                    // The Etag is surrounded by double-quotes, so those must be
                    // stripped.
                    ifMatch = Util.trim(ifMatch, '"');
                    node.getETag(function(err, etag) {
                        if (err)
                            return cbprecond(err);

                        if (etag !== ifMatch) {
                             return cbprecond(new Exc.jsDAV_Exception_PreconditionFailed(
                                "An If-Match header was specified, but the ETag did not match",
                                "If-Match")
                            );
                        }
                        afterIfMatch();
                    });
                    return;
                }
                afterIfMatch();
            });
        }
        else {
            afterIfMatch();
        }

        function afterIfMatch() {
            if (ifNoneMatch = self.httpRequest.headers["if-none-match"]) {
                // The If-None-Match header contains an etag.
                // Only if the ETag does not match the current ETag, the request will succeed
                // The header can also contain *, in which case the request
                // will only succeed if the entity does not exist at all.
                var nodeExists = true;
                if (!node) {
                    self.getNodeForPath(uri, function(err, n) {
                        if (!Util.empty(err))
                            nodeExists = false;
                        else
                            node = n;
                        if (nodeExists) {
                            // The Etag is surrounded by double-quotes, so those must be
                            // stripped.
                            ifNoneMatch = Util.trim(ifNoneMatch, '"');
                            node.getETag(function(err, etag) {
                                if (err)
                                    return cbprecond(err);

                                if (ifNoneMatch === "*" || etag === ifNoneMatch) {
                                    if (handleAsGET) {
                                        self.httpResponse.writeHead(304);
                                        self.httpResponse.end();
                                        cbprecond(null, true);
                                        // @todo call cbprecond() differently here?
                                    }
                                    else {
                                        cbprecond(new Exc.jsDAV_Exception_PreconditionFailed(
                                            "An If-None-Match header was specified, but the ETag "
                                          + "matched (or * was specified).", "If-None-Match")
                                        );
                                    }
                                }
                                else {
                                    afterIfNoneMatch();
                                }
                            });
                            return;
                        }
                        else {
                            afterIfNoneMatch();
                        }
                    });
                }
                else {
                    afterIfNoneMatch();
                }
            }
            else {
                afterIfNoneMatch();
            }

            function afterIfNoneMatch() {
                if (!ifNoneMatch && (ifModifiedSince = self.httpRequest.headers["if-modified-since"])) {
                    // The If-Modified-Since header contains a date. We
                    // will only return the entity if it has been changed since
                    // that date. If it hasn't been changed, we return a 304
                    // header
                    // Note that this header only has to be checked if there was no
                    // If-None-Match header as per the HTTP spec.
                    var date = new Date(ifModifiedSince);

                    if (!node)
                        self.getNodeForPath(uri, function(err, n) {
                            if (!Util.empty(err))
                                return cbprecond(err);
                            node = n;
                            node.getLastModified(function(err, lastMod) {
                                if (lastMod) {
                                    lastMod = new Date("@" + lastMod);
                                    if (lastMod <= date) {
                                        self.httpResponse.writeHead(304);
                                        self.httpResponse.end();
                                        cbprecond(null, true);
                                        // @todo call cbprecond() differently here?
                                        return;
                                    }
                                }
                                afterIfModifiedSince();
                            });
                        });
                }
                else {
                    afterIfModifiedSince();
                }

                function afterIfModifiedSince() {
                    var date;
                    if (ifUnmodifiedSince = self.httpRequest.headers["if-unmodified-since"]) {
                        // The If-Unmodified-Since will allow the request if the
                        // entity has not changed since the specified date.
                        date = new Date(ifUnmodifiedSince);
                        if (!node) {
                            self.getNodeForPath(uri, function(err, n) {
                                if (!Util.empty(err))
                                    return cbprecond(err);
                                node = n;
                                finale();
                            });
                        }
                        else {
                            finale();
                        }
                    }
                    else {
                        cbprecond(null, false);
                    }

                    function finale() {
                        node.getLastModified(function(err, lastMod) {
                            if (lastMod) {
                                lastMod = new Date("@" + lastMod);
                                if (lastMod > date) {
                                    return cbprecond(new Exc.jsDAV_Exception_PreconditionFailed(
                                        "An If-Unmodified-Since header was specified, but the "
                                            + "entity has been changed since the specified date.",
                                        "If-Unmodified-Since")
                                                    );
                                }
                            }
                            cbprecond(null, false);
                        });
                    }
                }
            }
        }
    };

    /**
     * Generates a WebDAV propfind response body based on a list of nodes
     *
     * @param  {Array} fileProperties The list with nodes
     * @return {String}
     */
    this.generateMultiStatus = function(fileProperties) {
        var namespace, prefix, entry, href, response;
        var xml = '<?xml version="1.0" encoding="utf-8"?><d:multistatus';

        // Adding in default namespaces
        for (namespace in this.xmlNamespaces) {
            prefix = this.xmlNamespaces[namespace];
            xml += ' xmlns:' + prefix + '="' + namespace + '"';
        }

        xml += ">";

        for (var i in fileProperties) {
            entry = fileProperties[i];
            href = entry["href"];
            //delete entry["href"];

            response = jsDAV_Property_Response.new(href, entry);
            xml = response.serialize(this, xml);
        }

        return xml + "</d:multistatus>";
    };

    /**
     * Returns a list of HTTP headers for a particular resource
     *
     * The generated http headers are based on properties provided by the
     * resource. The method basically provides a simple mapping between
     * DAV property and HTTP header.
     *
     * The headers are intended to be used for HEAD and GET requests.
     *
     * @param {String} path
     */
    this.getHTTPHeaders = function(path, cbheaders) {
        var header;
        var propertyMap = {
            "{DAV:}getcontenttype"   : "content-type",
            "{DAV:}getcontentlength" : "content-length",
            "{DAV:}getlastmodified"  : "last-modified",
            "{DAV:}getetag"          : "etag"
        };
        var headers    = {
            "pragma"        : "no-cache",
            "cache-control" : "no-cache, no-transform"
        };
        this.getProperties(path, ["{DAV:}getcontenttype", "{DAV:}getcontentlength",
            "{DAV:}getlastmodified", "{DAV:}getetag"],
            function(err, properties) {
                if (!Util.empty(err))
                    return cbheaders(err, headers);
                for (var prop in propertyMap) {
                    header = propertyMap[prop];
                    if (properties[prop]) {
                        // GetLastModified gets special cased
                        if (properties[prop].hasFeature && properties[prop].hasFeature(jsDAV_Property_GetLastModified))
                            headers[header] = Util.dateFormat(properties[prop].getTime(), Util.DATE_RFC1123);
                        else
                            headers[header] = properties[prop];
                    }
                }
                cbheaders(null, headers);
            });
    };

    /**
     * Returns a list of properties for a path
     *
     * This is a simplified version getPropertiesForPath.
     * if you aren't interested in status codes, but you just
     * want to have a flat list of properties. Use this method.
     *
     * @param {String} path
     * @param {Array}  propertyNames
     */
    this.getProperties = function(path, propertyNames, cbgetprops) {
        this.getPropertiesForPath(path, propertyNames, 0, function(err, result) {
            if (!Util.empty(err))
                return cbgetprops(err);
            return cbgetprops(null, result[path]["200"]);
        });
    };

    /**
     * Returns a list of properties for a given path
     *
     * The path that should be supplied should have the baseUrl stripped out
     * The list of properties should be supplied in Clark notation. If the list
     * is empty 'allprops' is assumed.
     *
     * If a depth of 1 is requested child elements will also be returned.
     *
     * @param {String} path
     * @param {Array}  propertyNames
     * @param {Number} depth
     * @return {Array}
     */
    this.getPropertiesForPath = function(path, propertyNames, depth, cbgetpropspath) {
        propertyNames = propertyNames || [];
        depth         = depth || 0;

        if (depth !== 0)
            depth = 1;

        var returnPropertyList = {};
        var self               = this;

        this.getNodeForPath(path, function(err, parentNode) {
            if (!Util.empty(err))
                return cbgetpropspath(err);

            var nodes = {};
            var nodesPath = [];
            nodes[path] = parentNode;
            nodesPath.push(path);

            console.log("getPropertiesForPath", depth, parentNode,parentNode.hasFeature(jsDAV_iCollection));
            if (depth == 1 && parentNode.hasFeature(jsDAV_iCollection)) {
                parentNode.getChildren(function(err, cNodes) {
                    if (!Util.empty(err))
                        return cbgetpropspath(err);
                    for (var i = 0, l = cNodes.length; i < l; ++i) {
                        nodes[cNodes[i].path] = cNodes[i];
                        nodesPath.push(cNodes[i].path);
                    }
                    afterGetChildren(nodes, nodesPath);
                });
            }
            else {
                afterGetChildren(nodes, nodesPath);
            }

            function afterGetChildren(nodes, nodesPath) {
                // If the propertyNames array is empty, it means all properties are requested.
                // We shouldn't actually return everything we know though, and only return a
                // sensible list.
                var allProperties = (propertyNames.length === 0);

                function afterGetProperty(rprop, rpath, remRT, newProps, cbnext) {
                    // If we were unable to find the property, we will list it as 404.
                    if (!allProperties && newProps["200"][rprop])
                        delete newProps["404"][rprop];

                    var node = nodes[rpath];
                    rpath = Util.trim(rpath, "/");
                    self.dispatchEvent("afterGetProperties", rpath, newProps, node, function() {
                        if (parentNode.hasFeature(jsDAV_iCollection)) {
                            // correct href when mountpoint is different than the
                            // absolute location of the path
                            var s = Util.trim(self.server.tree.basePath, "/");
                            if (s.charAt(0) != ".") {
                                rpath = s.indexOf(self.server.baseUri) !== 0
                                    ? rpath.replace(new RegExp("^" + Util.escapeRegExp(s)), "").replace(/^[\/]+/, "")
                                    : rpath;
                            }
                        }
                        newProps["href"] = rpath;

                        // Its is a WebDAV recommendation to add a trailing slash to collectionnames.
                        // Apple's iCal also requires a trailing slash for principals (rfc 3744).
                        // Therefore we add a trailing / for any non-file. This might need adjustments
                        // if we find there are other edge cases.
                        if (rpath !== "" && newProps["200"]["{DAV:}resourcetype"]
                          && newProps["200"]["{DAV:}resourcetype"].getValue() !== null) {
                            newProps["href"] += "/";
                        }

                        // If the resourcetype property was manually added to the requested property list,
                        // we will remove it again.
                        if (remRT)
                            delete newProps["200"]["{DAV:}resourcetype"];

                        returnPropertyList[rpath] = newProps;
                        cbnext();
                    });
                }

                Async.list(nodesPath)
                    .delay(0, 10)
                    .each(function(myPath, cbnextpfp) {
                         var node = nodes[myPath];
                         var newProperties = {
                            "200" : {},
                            "404" : {}
                         };
                         if (node.hasFeature(jsDAV_iProperties)) {
                             node.getProperties(propertyNames, function(err, props) {
                                 if (!err && props)
                                     newProperties["200"] = props;
                                 buildProperties();
                             });
                         }
                         else
                            buildProperties();

                         function buildProperties() {
                             if (allProperties) {
                                 // Default list of propertyNames, when all properties were requested.
                                 propertyNames = [
                                     "{DAV:}getlastmodified",
                                     "{DAV:}getcontentlength",
                                     "{DAV:}resourcetype",
                                     "{DAV:}quota-used-bytes",
                                     "{DAV:}quota-available-bytes",
                                     "{DAV:}getetag",
                                     "{DAV:}getcontenttype"
                                 ];

                                 // We need to make sure this includes any propertyname already
                                 // returned from node.getProperties();
                                 var keys = [];
                                 for (var i in newProperties["200"])
                                     keys.push(i);
                                 propertyNames = propertyNames.concat(keys);

                                 // Making sure there's no double entries
                                 propertyNames = Util.makeUnique(propertyNames);
                             }

                             // If the resourceType was not part of the list, we manually add it
                             // and mark it for removal. We need to know the resourcetype in order
                             // to make certain decisions about the entry.
                             // WebDAV dictates we should add a / and the end of href's for collections
                             var removeRT = false;
                             if (propertyNames.indexOf("{DAV:}resourcetype") == -1) {
                                 propertyNames.push("{DAV:}resourcetype");
                                 removeRT = true;
                             }

                             // next loop!
                             Async.list(propertyNames)
                                  .delay(0, 10)
                                  .each(function(prop, cbnextprops) {
                                      if (typeof newProperties["200"][prop] != "undefined")
                                          return cbnextprops();

                                      if (prop == "{DAV:}getlastmodified") {
                                          node.getLastModified(function(err, dt) {
                                              if (!err && dt)
                                                  newProperties["200"][prop] = jsDAV_Property_GetLastModified.new(dt);
                                              afterGetProperty(prop, myPath, removeRT, newProperties, cbnextprops);
                                          });
                                      }
                                      else if (prop == "{DAV:}getcontentlength") {
                                          if (node.hasFeature(jsDAV_iFile)) {
                                              node.getSize(function(err, size) {
                                                  if (!err && typeof size != "undefined")
                                                      newProperties["200"][prop] = parseInt(size, 10);
                                                  afterGetProperty(prop, myPath, removeRT, newProperties, cbnextprops);
                                              });
                                          }
                                          else {
                                              cbnextprops();
                                          }
                                      }
                                      else if (prop == "{DAV:}resourcetype") {
                                          newProperties["200"][prop] = jsDAV_Property_ResourceType.new(
                                              node.hasFeature(jsDAV_iCollection)
                                                  ? exports.NODE_DIRECTORY
                                                  : exports.NODE_FILE);
                                          afterGetProperty(prop, myPath, removeRT, newProperties, cbnextprops);
                                      }
                                      else if (prop == "{DAV:}quota-used-bytes") {
                                          if (node.hasFeature(jsDAV_iQuota)) {
                                              node.getQuotaInfo(function(err, quotaInfoUsed) {
                                                  if (!err && quotaInfoUsed.length)
                                                      newProperties["200"][prop] = quotaInfoUsed[0];
                                                  afterGetProperty(prop, myPath, removeRT, newProperties, cbnextprops);
                                              });
                                          }
                                          else {
                                              cbnextprops();
                                          }
                                      }
                                      else if (prop == "{DAV:}quota-available-bytes") {
                                          if (node.hasFeature(jsDAV_iQuota)) {
                                              node.getQuotaInfo(function(err, quotaInfoAvail) {
                                                  if (!err && quotaInfoAvail.length)
                                                      newProperties["200"][prop] = quotaInfoAvail[1];
                                                  afterGetProperty(prop, myPath, removeRT, newProperties, cbnextprops);
                                              });
                                          }
                                          else {
                                              cbnextprops();
                                          }
                                      }
                                      else if (prop == "{DAV:}getetag") {
                                          if (node.hasFeature(jsDAV_iFile)) {
                                              node.getETag(function(err, etag) {
                                                  if (!err && etag)
                                                      newProperties["200"][prop] = etag;
                                                  afterGetProperty(prop, myPath, removeRT, newProperties, cbnextprops);
                                              });
                                          }
                                          else {
                                              cbnextprops();
                                          }
                                      }
                                      else if (prop == "{DAV:}getcontenttype") {
                                          if (node.hasFeature(jsDAV_iFile)) {
                                              node.getContentType(function(err, ct) {
                                                  if (!err && ct)
                                                      newProperties["200"][prop] = ct;
                                                  afterGetProperty(prop, myPath, removeRT, newProperties, cbnextprops);
                                              });
                                          }
                                          else {
                                              cbnextprops();
                                          }
                                      }
                                      else if (prop == "{DAV:}supported-report-set") {
                                          newProperties["200"][prop] = jsDAV_Property_SupportedReportSet.new();
                                          afterGetProperty(prop, myPath, removeRT, newProperties, cbnextprops);
                                      }
                                      else {
                                          cbnextprops();
                                      }
                                  })
                                  .end(function(err) {
                                      cbnextpfp(err);
                                  });
                         }
                     })
                     .end(function(err) {
                         if (!Util.empty(err))
                             return cbgetpropspath(err);

                         cbgetpropspath(null, returnPropertyList);
                     });
            }
        });
    };

    /**
     * Returns the HTTP range header
     *
     * This method returns null if there is no well-formed HTTP range request
     * header or array(start, end).
     *
     * The first number is the offset of the first byte in the range.
     * The second number is the offset of the last byte in the range.
     *
     * If the second offset is null, it should be treated as the offset of the
     * last byte of the entity.
     * If the first offset is null, the second offset should be used to retrieve
     * the last x bytes of the entity.
     *
     * return mixed
     */
    this.getHTTPRange = function() {
        var range = this.httpRequest.headers["range"];
        if (!range)
            return null;

        // Matching "Range: bytes=1234-5678: both numbers are optional
        var matches = range.match(/^bytes=([0-9]*)-([0-9]*)$/i);
        if (!matches || !matches.length)
            return null;

        if (matches[1] === "" && matches[2] === "")
            return null;

        return matches.slice(1).map(function(rangePart) {
            rangePart = parseFloat(rangePart);
            return isNaN(rangePart) ? null : rangePart;
        });
    };

    /**
     * Returns the HTTP depth header
     *
     * This method returns the contents of the HTTP depth request header. If the
     * depth header was 'infinity' it will return the jsDAV_Handler.DEPTH_INFINITY object
     * It is possible to supply a default depth value, which is used when the depth
     * header has invalid content, or is completely non-existant
     *
     * @param  {mixed}   default
     * @return {Number}
     */
    this.getHTTPDepth = function(def) {
        def = def || exports.DEPTH_INFINITY;
        // If its not set, we'll grab the default
        var depth = this.httpRequest.headers["depth"];
        if (!depth)
            return def;

        if (depth == "infinity")
            return exports.DEPTH_INFINITY;

        // If its an unknown value. we'll grab the default
        if (typeof depth != "number")
            return def;

        return parseInt(depth, 10);
    };

    /**
     * This method parses the PROPFIND request and returns its information
     *
     * This will either be a list of properties, or an empty array; in which case
     * an {DAV:}allprop was requested.
     *
     * @param  {String} body
     * @return {Array}
     */
    this.parsePropfindRequest = function(body, cbpropfindreq) {
        // If the propfind body was empty, it means IE is requesting 'all' properties
        if (!body)
            return cbpropfindreq(null, []);

        Util.loadDOMDocument(body, this.server.options.parser, function(err, oXml) {
            //Util.log("XML ", oXml);
            if (!Util.empty(err))
                return cbpropfindreq(err);
            cbpropfindreq(null, Object.keys(Util.parseProperties(oXml.propfind || oXml)));
        });
    };

    /**
     * This method parses a Proppatch request
     *
     * Proppatch changes the properties for a resource. This method
     * returns a list of properties.
     *
     * The keys in the returned array contain the property name (e.g.: {DAV:}displayname,
     * and the value contains the property value. If a property is to be removed
     * the value will be null.
     *
     * @param  {String}   body           Xml body
     * @param  {Function} cbproppatchreq Callback that is the return body of this function
     * @return {Object}   list of properties in need of updating or deletion
     */
    this.parseProppatchRequest = function(body, cbproppatchreq) {
        //We'll need to change the DAV namespace declaration to something else
        //in order to make it parsable
        var operation, innerProperties, propertyValue;
        var self = this;
        Util.loadDOMDocument(body, this.server.options.parser, function(err, dom) {
            if (!Util.empty(err))
                return cbproppatchreq(err);
            var child, propertyName;
            var newProperties = {};
            var i             = 0;
            var c             = dom.childNodes;
            var l             = c.length;
            for (; i < l; ++i) {
                child     = c[i];
                operation = Util.toClarkNotation(child);
                if (!operation || operation !== "{DAV:}set" && operation !== "{DAV:}remove")
                    continue;

                innerProperties = Util.parseProperties(child, self.propertyMap);
                for (propertyName in innerProperties) {
                    propertyValue = innerProperties[propertyName];
                    if (operation === "{DAV:}remove")
                        propertyValue = null;
                    newProperties[propertyName] = propertyValue;
                }
            }
            cbproppatchreq(null, newProperties);
        });
    };

    /**
     * This method updates a resource's properties
     *
     * The properties array must be a list of properties. Array-keys are
     * property names in clarknotation, array-values are it's values.
     * If a property must be deleted, the value should be null.
     *
     * Note that this request should either completely succeed, or
     * completely fail.
     *
     * The response is an array with statuscodes for keys, which in turn
     * contain arrays with propertynames. This response can be used
     * to generate a multistatus body.
     *
     * @param  {String}  uri
     * @param  {Object}  properties
     * @return {Object}
     */
    this.updateProperties = function(uri, properties, cbupdateprops) {
        // we'll start by grabbing the node, this will throw the appropriate
        // exceptions if it doesn't.
        var props;
        var self   = this;
        var result = {};
        var remainingProperties = Util.extend({}, properties);
        var hasError            = false;
        result[uri] = {
            "200" : [],
            "403" : [],
            "424" : []
        };

        this.getNodeForPath(uri, function(err, node) {
            if (!Util.empty(err))
                return cbupdateprops(err);
            // If the node is not an instance of jsDAV_iProperties, every
            // property is 403 Forbidden
            // simply return a 405.
            var propertyName;
            if (!node.hasFeature(jsDAV_iProperties)) {
                hasError = true;
                for (propertyName in properties)
                    Util.arrayRemove(result[uri]["403"], propertyName);
                remainingProperties = {};
            }

            // Running through all properties to make sure none of them are protected
            if (!hasError) {
                for (propertyName in properties) {
                    if (self.protectedProperties.indexOf(propertyName) > -1) {
                        Util.arrayRemove(result[uri]["403"], propertyName);
                        delete remainingProperties[propertyName];
                        hasError = true;
                    }
                }
            }

            // Only if there were no errors we may attempt to update the resource
            if (!hasError) {
                var updateResult = node.updateProperties(properties);
                remainingProperties = {};

                if (updateResult === true) {
                    // success
                    for (propertyName in properties)
                        Util.arrayRemove(result[uri]["200"], propertyName);
                }
                else if (updateResult === false) {
                    // The node failed to update the properties for an
                    // unknown reason
                    for (propertyName in properties)
                        Util.arrayRemove(result[uri]["403"], propertyName);
                }
                else if (typeof updateResult == "object") {
                    // The node has detailed update information
                    result = updateResult;
                }
                else {
                    return cbupdateprops(new Exc.jsDAV_Exception("Invalid result from updateProperties"));
                }
            }

            for (propertyName in remainingProperties) {
                // if there are remaining properties, it must mean
                // there's a dependency failure
                Util.arrayRemove(result[uri]["424"], propertyName);
            }

            // Removing empty array values
            for (var status in result[uri]) {
                props = result[uri][status];
                if (props.length === 0)
                    delete result[uri][status];
            }
            result[uri]["href"] = uri;
            cbupdateprops(null, result);
        });
    };

    /**
     * This method is invoked by sub-systems creating a new file.
     *
     * Currently this is done by HTTP PUT and HTTP LOCK (in the Locks_Plugin).
     * It was important to get this done through a centralized function,
     * allowing plugins to intercept this using the beforeCreateFile event.
     *
     * @param {String} uri
     * @param {Buffer} dataOrStream. Set to `null` to use a stream
     * @param {String} [enc]
     * @return {void}
     */
    this.createFile = function(uri, dataOrStream, enc, cbcreatefile) {
        var parts = Util.splitPath(uri);
        var dir   = parts[0];
        var name  = parts[1];
        var self  = this;

        this.dispatchEvent("beforeBind", uri, function(stop) {
            if (stop === true)
                return cbcreatefile();
            self.getNodeForPath(dir, function(err, parent) {
                if (!Util.empty(err))
                    return cbcreatefile(err);
                self.dispatchEvent("beforeCreateFile", uri, dataOrStream, enc, function(stop) {
                    if (stop === true)
                        return cbcreatefile();

                    if (dataOrStream === null) {
                        if (!parent.createFileStream) {
                            self.getRequestBody(enc, null, function(err, body) {
                                if (err)
                                    return cbcreatefile(err);

                                parent.createFile(name, body, enc || "utf8", afterBind);
                            });
                        }
                        else
                            parent.createFileStream(self, name, enc || "utf8", afterBind);
                    }
                    else
                        parent.createFile(name, dataOrStream, enc || "utf8", afterBind);

                    function afterBind(err) {
                        if (!Util.empty(err))
                            return cbcreatefile(err);
                        self.dispatchEvent("afterBind", uri, Path.join(self.server.tree.basePath, uri));
                        cbcreatefile();
                    }
                });
            });
        });
    };

    /**
     * This method is invoked by sub-systems creating a new directory.
     *
     * @param  {String}   uri
     * @param  {Function} cbcreatedir
     * @return {void}
     */
    this.createDirectory = function(uri, cbcreatedir) {
        this.createCollection(uri, ["{DAV:}collection"], {}, cbcreatedir);
    };

    /**
     * Use this method to create a new collection
     *
     * The {DAV:}resourcetype is specified using the resourceType array.
     * At the very least it must contain {DAV:}collection.
     *
     * The properties array can contain a list of additional properties.
     *
     * @param  {string} uri          The new uri
     * @param  {Array}  resourceType The resourceType(s)
     * @param  {Object} properties   A list of properties
     * @return {void}
     */
    this.createCollection = function(uri, resourceType, properties, cbcreatecoll) {
        var self      = this;
        var path      = Util.splitPath(uri);
        var parentUri = path[0];
        var newName   = path[1];

        // Making sure {DAV:}collection was specified as resourceType
        if (resourceType.indexOf("{DAV:}collection") == -1) {
            return cbcreatecoll(new Exc.jsDAV_Exception_InvalidResourceType(
                "The resourceType for this collection must at least include {DAV:}collection")
            );
        }

        // Making sure the parent exists
        this.getNodeForPath(parentUri, function(err, parent) {
            if (!Util.empty(err))
                return cbcreatecoll(new Exc.jsDAV_Exception_Conflict("Parent node does not exist"));

            // Making sure the parent is a collection
            if (!parent.hasFeature(jsDAV_iCollection))
                return cbcreatecoll(new Exc.jsDAV_Exception_Conflict("Parent node is not a collection"));

            // Making sure the child does not already exist
            parent.getChild(newName, function(err, ch) {
                // If we got here.. it means there's already a node on that url,
                // and we need to throw a 405
                if (typeof ch != "undefined") {
                    return cbcreatecoll(new Exc.jsDAV_Exception_MethodNotAllowed(
                        "The resource you tried to create already exists")
                    );
                }
                if (err && err.type != "jsDAV_Exception_FileNotFound")
                    return cbcreatecoll(err);

                self.dispatchEvent("beforeBind", uri, function(stop) {
                    if (stop === true)
                        return cbcreatecoll();

                    // There are 2 modes of operation. The standard collection
                    // creates the directory, and then updates properties
                    // the extended collection can create it directly.
                    if (parent.hasFeature(jsDAV_iExtendedCollection)) {
                        parent.createExtendedCollection(newName, resourceType, properties, cbcreatecoll);
                    }
                    else {
                        // No special resourcetypes are supported
                        if (resourceType.length > 1) {
                            return cbcreatecoll(new Exc.jsDAV_Exception_InvalidResourceType(
                                "The {DAV:}resourcetype you specified is not supported here.")
                            );
                        }
                        parent.createDirectory(newName, function(err, res) {
                            if (!Util.empty(err))
                                return cbcreatecoll(err);

                            if (properties.length > 0) {
                                self.updateProperties(uri, properties, function(err, errorResult) {
                                    if (err || !errorResult["200"].length)
                                        return rollback(err, errorResult);
                                    self.dispatchEvent("afterBind", uri, Path.join(parent.path, newName));
                                    cbcreatecoll();
                                });
                            }
                            else {
                                self.dispatchEvent("afterBind", uri, Path.join(parent.path, newName));
                                cbcreatecoll();
                            }

                            function rollback(exc, res) {
                                self.server.tree.getNodeForPath(uri, function(err, node) {
                                    if (err)
                                        return cbcreatecoll(err);
                                    self.dispatchEvent("beforeUnbind", uri, function(stop) {
                                        if (stop === true)
                                            return cbcreatecoll();
                                        node["delete"]();
                                        // Re-throwing exception
                                        cbcreatecoll(exc, err);
                                    });
                                });
                            }
                        });
                    }
                });
            });
        });
    };

    /**
     * Returns information about Copy and Move requests
     *
     * This function is created to help getting information about the source and
     * the destination for the WebDAV MOVE and COPY HTTP request. It also
     * validates a lot of information and throws proper exceptions
     *
     * The returned value is an array with the following keys:
     *   * source - Source path
     *   * destination - Destination path
     *   * destinationExists - Wether or not the destination is an existing url
     *     (and should therefore be overwritten)
     *
     * @return {Object}
     */
    this.getCopyAndMoveInfo = function(cbcopymove) {
        var source, destination;
        try {
            source = this.getRequestUri();
        }
        catch (ex) {
            return cbcopymove(ex);
        }

        // Collecting the relevant HTTP headers
        if (!this.httpRequest.headers["destination"])
            return cbcopymove(new Exc.jsDAV_Exception_BadRequest("The destination header was not supplied"));

        try {
            destination = this.calculateUri(this.httpRequest.headers["destination"]);
        }
        catch (ex) {
            return cbcopymove(ex);
        }
        var overwrite = this.httpRequest.headers["overwrite"];
        if (!overwrite)
            overwrite = "T";
        if (overwrite.toUpperCase() == "T") {
            overwrite = true;
        }
        else if (overwrite.toUpperCase() == "F") {
            overwrite = false;
        }
        else {
            // We need to throw a bad request exception, if the header was invalid
            return cbcopymove(new Exc.jsDAV_Exception_BadRequest(
                "The HTTP Overwrite header should be either T or F")
            );
        }

        var destinationDir = Util.splitPath(destination)[0];
        var self           = this;

        // Collection information on relevant existing nodes
        this.getNodeForPath(destinationDir, function(err, destinationParent) {
            if (!Util.empty(err)) {
                // If the destination parent node is not found, we throw a 409
                return cbcopymove(err.type == "jsDAV_Exception_FileNotFound"
                    ? new Exc.jsDAV_Exception_Conflict("The destination node is not found")
                    : err);
            }
            if (!destinationParent.hasFeature(jsDAV_iCollection)) {
                return cbcopymove(new Exc.jsDAV_Exception_UnsupportedMediaType(
                    "The destination node is not a collection")
                );
            }

            self.getNodeForPath(destination, function(err, destinationNode) {
                // Destination didn't exist, we're all good
                if (!Util.empty(err)) {
                     if (err.type == "jsDAV_Exception_FileNotFound")
                        destinationNode = false;
                     else
                         return cbcopymove(err);
                }
                // If this succeeded, it means the destination already exists
                // we"ll need to throw precondition failed in case overwrite is false
                if (destinationNode && !overwrite) {
                    return cbcopymove(new Exc.jsDAV_Exception_PreconditionFailed(
                        "The destination node already exists, and the overwrite header is set to false",
                        "Overwrite"));
                }

                // These are the three relevant properties we need to return
                cbcopymove(null, {
                    "source"            : source,
                    "destination"       : destination,
                    "destinationExists" : !Util.empty(destinationNode),
                    "destinationNode"   : destinationNode
                });
            });
        });
    };

    /**
     * Returns a full HTTP status message for an HTTP status code
     *
     * @param {Number} code
     * @return {string}
     */
    this.getStatusMessage = function(code) {
        code = String(code);
        return "HTTP/1.1 " + code + " " + exports.STATUS_MAP[code];
    };
}).call(jsDAV_Handler.prototype = new Util.EventEmitter());
