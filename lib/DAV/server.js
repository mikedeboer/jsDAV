/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var Http   = require("http"),
    Url    = require("url"),
    Sys    = require("sys"),
    Exc    = require("./exceptions"),
    Util   = require("./util"),
    Events = require("events"),

    // DAV classes used directly by the Server object
    jsDAV                             = require("./../jsdav"),
    jsDAV_SimpleDirectory             = require("./simpleDirectory").jsDAV_SimpleDirectory,
    jsDAV_ObjectTree                  = require("./objectTree").jsDAV_ObjectTree,
    jsDAV_Property_Response           = require("./property/response").jsDAV_Property_Response,
    jsDAV_Property_GetLastModified    = require("./property/getLastModified").jsDAV_Property_GetLastModified,
    jsDAV_Property_ResourceType       = require("./property/resourceType").jsDAV_Property_ResourceType,
    jsDAV_Property_SupportedReportSet = require("./property/supportedReportSet").jsDAV_Property_SupportedReportSet;

exports.DEFAULT_PORT = 41197;
exports.DEFAULT_HOST = "127.0.0.1";

function Server(options) {
    /**
     * This is a flag that allow or not showing file, line and code
     * of the exception in the returned XML
     *
     * @var bool
     */
    this.debugExceptions = exports.debugMode;

    if (options && options.tree && options.tree.hasFeature(jsDAV.__TREE__)) {
        this.tree = options.tree;
    }
    else if (options && options.node && options.node.hasFeature(jsDAV.__INODE__)) {
        this.tree = new jsDAV_ObjectTree(options.node);
    }
    else if (!options) {
        var root  = new jsDAV_SimpleDirectory("root");
        this.tree = new jsDAV_ObjectTree(root);
    }
    else {
        throw new Exc.jsDAV_Exception("Invalid argument passed to constructor. "
            + "Argument must either be an instance of jsDAV_Tree, jsDAV_iNode or null");
    }

    this.setBaseUri(this.guessBaseUri());

    Http.Server.call(this, this.exec);
}

exports.jsDAVServer = Server;

/**
 * Inifinity is used for some request supporting the HTTP Depth header and indicates
 * that the operation should traverse the entire tree
 */
Server.DEPTH_INFINITY = -1;

/**
 * Nodes that are files, should have this as the type property
 */
Server.NODE_FILE      = 1;

/**
 * Nodes that are directories, should use this value as the type property
 */
Server.NODE_DIRECTORY = 2;

Server.PROP_SET       = 1;
Server.PROP_REMOVE    = 2;

Server.STATUS_MAP     = {
    "100:": "Continue",
    "101:": "Switching Protocols",
    "200:": "Ok",
    "201:": "Created",
    "202:": "Accepted",
    "203:": "Non-Authorative Information",
    "204:": "No Content",
    "205:": "Reset Content",
    "206:": "Partial Content",
    "207:": "Multi-Status", // RFC 4918
    "208:": "Already Reported", // RFC 5842
    "300:": "Multiple Choices",
    "301:": "Moved Permanently",
    "302:": "Found",
    "303:": "See Other",
    "304:": "Not Modified",
    "305:": "Use Proxy",
    "307:": "Temporary Redirect",
    "400:": "Bad request",
    "401:": "Unauthorized",
    "402:": "Payment Required",
    "403:": "Forbidden",
    "404:": "Not Found",
    "405:": "Method Not Allowed",
    "406:": "Not Acceptable",
    "407:": "Proxy Authentication Required",
    "408:": "Request Timeout",
    "409:": "Conflict",
    "410:": "Gone",
    "411:": "Length Required",
    "412:": "Precondition failed",
    "413:": "Request Entity Too Large",
    "414:": "Request-URI Too Long",
    "415:": "Unsupported Media Type",
    "416:": "Requested Range Not Satisfiable",
    "417:": "Expectation Failed",
    "418:": "I'm a teapot", // RFC 2324
    "422:": "Unprocessable Entity", // RFC 4918
    "423:": "Locked", // RFC 4918
    "424:": "Failed Dependency", // RFC 4918
    "500:": "Internal Server Error",
    "501:": "Not Implemented",
    "502:": "Bad Gateway",
    "503:": "Service Unavailable",
    "504:": "Gateway Timeout",
    "505:": "HTTP Version not supported",
    "507:": "Unsufficient Storage", // RFC 4918
    "508:": "Loop Detected" // RFC 5842
};

/**
 * XML namespace for all jsDAV related elements
 */
Server.NS_AJAXORG = "http://ajax.org/2005/aml";

(function() {
    /**
     * The tree object
     *
     * @var jsDAV_Tree
     */
    this.tree = null;

    /**
     * The base uri
     *
     * @var string
     */
    this.baseUri = "/";

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
     * The list of plugins
     *
     * @var array
     */
    this.plugins = {};

    /**
     * This array contains a list of callbacks we should call when certain events
     * are triggered
     *
     * @var array
     */
    this.eventSubscriptions = {};

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
        "{DAV:}current-user-principal",
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

    var encodingMap = {
        "application/x-www-form-urlencoded": "utf8",
        "application/json": "utf8",
        "text/plain": "utf8"
    };

    function mime(req) {
        var str = req.headers["content-type"] || "";
        return str.split(";")[0];
    }

    /**
     * Called when an http request comes in, pass it on to invoke, and handle 
     * the response in case of an exception.
     *
     * @param {ServerRequest}  req
     * @param {ServerResponse} resp
     * @return void
     */
    this.exec = function(req, resp) {
        try {
            this.httpRequest  = req;
            this.httpResponse = resp;

            this.mimeType     = mime(req);
            this.data         = "";

            this.invoke();
        }
        catch (ex) {
            this.handleError(ex);
        }
    };

    /**
     * Handles a http request, and execute a method based on its name
     *
     * @return void
     */
    this.invoke = function() {
        var method = this.httpRequest.method.toUpperCase();

        if (this.emit("beforeMethod", method))
            return;

        // Make sure this is a HTTP method we support
        if (internalMethods[method]) {
            this["http" + method.charAt(0) + method.toLowerCase().substr(1)]();
        }
        else {
            if (!this.emit("unknownMethod", method)) {
                // Unsupported method
                throw new Exc.jsDAV_Exception_NotImplemented();
            }

        }
    };

    this.handleError = function(e) {
        if (jsDAV.debugMode) {
            Sys.puts("ERROR: " + e);
            throw e; // DEBUGGING!
        }
        var xml = '<?xml version="1.0" encoding="utf-8"?>'
                + '<d:error xmlns:a=' + Server.NS_AJAXORG + '">'
                + '    <a:exception>' + e.toString() + '</a:exception>'
                + '    <a:message>'   + e.message + '</a:message>'
        if (this.debugExceptions) {
            xml += '<a:file>' + e.filename + '</a:file>'
                +  '<a:line>' + e.line + '</a:line>'
        }
        xml += '<a:jsdav-version>' + Server.VERSION + '</a:jsdav-version>';

        var code    = 500,
            headers = {};
        if (e.type && e.type.indexOf("jsDAV_Exception") === 0) {
            code = e.code;
            e.serialize(this, xml);
            headers = e.getHTTPHeaders(this);
        }

        headers["Content-Type"] = "application/xml; charset=utf-8";

        this.httpResponse.writeHead(code, headers);
        this.httpResponse.end(xml + '</d:error>', "utf-8");
    };

    /**
     * Sets the base server uri
     *
     * @param {string} uri
     * @return void
     */
    this.setBaseUri = function(uri) {
        // If the baseUri does not end with a slash, we must add it
        if (uri.charAt(uri.length - 1) !== "/")
            uri += "/";

        this.baseUri = uri;
    };

    /**
     * Returns the base responding uri
     *
     * @return string
     */
    this.getBaseUri = function() {
        return this.baseUri;
    };

    /**
     * This method attempts to detect the base uri.
     * Only the PATH_INFO variable is considered.
     *
     * If this variable is not set, the root (/) is assumed.
     *
     * @return void
     */
    this.guessBaseUri = function() {
        var pos, pathInfo, uri;

        if (this.httpRequest) {
            uri      = this.httpRequest.url;
            pathInfo = Url.parse(uri).pathname;
        }

        // If PATH_INFO is not found, we just return /
        if (pathInfo) {
            // We need to make sure we ignore the QUERY_STRING part
            if ((pos = uri.indexOf("?")) > -1)
                uri = uri.substr(0, pos);

            // PATH_INFO is only set for urls, such as: /example.php/path
            // in that case PATH_INFO contains "/path".
            // Note that REQUEST_URI is percent encoded, while PATH_INFO is
            // not, Therefore they are only comparable if we first decode
            // REQUEST_INFO as well.
            var decodedUri = unescape(uri);

            // A simple sanity check:
            if(decodedUri.substr(decodedUri.length - pathInfo.length) === pathInfo) {
                var baseUri = decodedUrisubstr(0, decodedUri.length - pathInfo.length);
                return Util.rtrim(baseUri, "/") + "/";
            }

            throw new Exc.jsDAV_Exception("The REQUEST_URI (" + uri 
                + ") did not end with the contents of PATH_INFO (" + pathInfo
                + "). This server might be misconfigured.");
        }

        // The fallback is that we're just going to assume the server root.
        return "/";
    };

    /**
     * HTTP OPTIONS
     *
     * @return void
     */
    this.httpOptions = function() {
        try {
            var uri = this.getRequestUri();
        }
        catch (ex) {
            return this.handleError(ex);
        }

        var _self = this;
        this.getAllowedMethods(function(err, methods) {
            if (err)
                return _self.handleError(err);
            var headers = {
                    "Allow": methods.join(",").toUpperCase(),
                    "MS-Author-Via"   : "DAV",
                    "Accept-Ranges"   : "bytes",
                    "X-Sabre-Version" : Server.VERSION,
                    "Content-Length"  : 0
                },
                features = ["1", "3", "extended-mkcol"];


            for (var plugin in _self.plugins)
                features = features.concat(plugin.getFeatures());

            headers["DAV"] = features.join(",");

            _self.httpResponse.writeHead(200, headers);
            _self.httpResponse.end();
        });
    };

    /**
     * HTTP GET
     *
     * This method simply fetches the contents of a uri, like normal
     *
     * @return void
     */
    this.httpGet = function() {
        var uri   = this.getRequestUri(),
            node  = this.tree.getNodeForPath(uri, 0),
            _self = this;

        if (!this.checkPreconditions(true))
            return false;

        if (!node.hasFeature(jsDAV.__IFILE__))
            throw new Exc.jsDAV_Exception_NotImplemented("GET is only implemented on File objects");
        var body = node.get();

        // Converting string into stream, if needed.
        if (is_string(body)) {
            stream = fopen("php://temp","r+");
            fwrite(stream, body);
            rewind(stream);
            body = stream;
        }

        /*
         * TODO: getetag, getlastmodified, getsize should also be used using
         * this method
         */
        this.getHTTPHeaders(uri, function(err, httpHeaders) {
            if (err)
                return _self.handleError(err);
            var nodeSize = null;
            /* ContentType needs to get a default, because many webservers will otherwise
             * default to text/html, and we don't want this for security reasons.
             */
            if (!httpHeaders["Content-Type"])
                httpHeaders["Content-Type"] = "application/octet-stream";

            if (httpHeaders["Content-Length"]) {
                nodeSize = httpHeaders["Content-Length"];
                // Need to unset Content-Length, because we'll handle that during
                // figuring out the range
                delete httpHeaders["Content-Length"];
            }

            //this.httpResponse.setHeaders(httpHeaders);

            var range             = this.getHTTPRange(),
                ifRange           = this.httpRequest.headers["if-range"],
                ignoreRangeHeader = false;

            // If ifRange is set, and range is specified, we first need to check
            // the precondition.
            if (nodeSize && range && ifRange) {
                // if IfRange is parsable as a date we'll treat it as a DateTime
                // otherwise, we must treat it as an etag.
                try {
                    var ifRangeDate = new Date(ifRange);

                    // It's a date. We must check if the entity is modified since
                    // the specified date.
                    if (!httpHeaders["Last-Modified"]) {
                        ignoreRangeHeader = true;
                    }
                    else {
                        var modified = new Date(httpHeaders["Last-Modified"]);
                        if (modified > ifRangeDate)
                            ignoreRangeHeader = true;
                    }
                }
                catch (ex) {
                    // It's an entity. We can do a simple comparison.
                    if (!httpHeaders["ETag"])
                        ignoreRangeHeader = true;
                    else if (httpHeaders["ETag"] !== ifRange)
                        ignoreRangeHeader = true;
                }
            }

            // We're only going to support HTTP ranges if the backend provided a filesize
            if (!ignoreRangeHeader && nodeSize && range) {
                // Determining the exact byte offsets
                var start, end;
                if (range[0]) {
                    start = range[0];
                    end   = range[1] ? range[1] : nodeSize - 1;
                    if (start > nodeSize) {
                        throw new Exc.jsDAV_Exception_RequestedRangeNotSatisfiable(
                            "The start offset (" + range[0] + ") exceeded the size of the entity ("
                            + nodeSize + ")");
                    }

                    if (end < start) {
                        throw new Exc.jsDAV_Exception_RequestedRangeNotSatisfiable(
                            "The end offset (" + range[1] + ") is lower than the start offset ("
                            + range[0] + ")");
                    }
                    if (end > nodeSize)
                        end = nodeSize-1;

                }
                else {
                    start = nodeSize-range[1];
                    end   = nodeSize-1;
                    if (start < 0)
                        start = 0;
                }

                // New read/write stream
                var newStream = fopen("php://temp","r+");

                stream_copy_to_stream(body, newStream, end-start+1, start);
                rewind(newStream);

                httpHeaders["Content-Length"] = end - start + 1;
                httpHeaders["Content-Range"]  = "bytes " + start + "-" + end + "/" + nodeSize;
                _self.httpResponse.writeHead(206, httpHeaders);
                _self.httpResponse.end(newStream);
            }
            else {
                if (nodeSize)
                    httpHeaders["Content-Length"] = nodeSize;
                _self.httpResponse.writeHead(200, httpHeaders);
                _self.httpResponse.end(body);
            }
        });
    };

    /**
     * HTTP HEAD
     *
     * This method is normally used to take a peak at a url, and only get the
     * HTTP response headers, without the body.
     * This is used by clients to determine if a remote file was changed, so
     * they can use a local cached version, instead of downloading it again
     *
     * @return void
     */
    this.httpHead = function() {
        try {
            var uri = this.getRequestUri();
        }
        catch (ex) {
            return this.handleError(ex);
        }

        var _self = this;
        this.tree.getNodeForPath(uri, function(err, node) {
            if (err)
                return _self.handleError(err);
            /* This information is only collection for File objects.
             * Ideally we want to throw 405 Method Not Allowed for every
             * non-file, but MS Office does not like this
             */
            var headers = {};
            if (node.hasFeature(jsDAV.__IFILE__)) {
                _self.getHTTPHeaders(uri, function(err, headers) {
                    if (err)
                        return _self.handleError(err);
                    if (!headers["content-type"])
                        headers["content-type"] = "application/octet-stream";
                    afterHeaders();
                });
            }
            else {
                afterHeaders();
            }

            function afterHeaders() {
                _self.httpResponse.writeHead(200, headers);
                _self.httpResponse.end();
            }
        });
    };

    /**
     * HTTP Delete
     *
     * The HTTP delete method, deletes a given uri
     *
     * @return void
     */
    this.httpDelete = function() {
        try {
            var uri = this.getRequestUri();
        }
        catch (ex) {
            return this.handleError(ex);
        }

        var _self = this;
        this.tree.getNodeForPath(uri, function(err, node) {
            if (err)
                return _self.handleError(err);

            if (_self.emit("beforeUnbind", uri))
                return;
            node["delete"](function(err) {
                if (err)
                    return _self.handleError(err);
                _self.httpResponse.writeHead(204, {"Content-Length": "0"});
                _self.httpResponse.end();
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
     * @return void
     */
    this.httpPropfind = function() {
        var _self = this,
            req   = this.httpRequest,
            data  = "";
        req.setEncoding("utf8");
        req.addListener("data", function(chunk) {
            data += chunk;
        });
        req.addListener("end",  function() {
            if (jsDAV.debugMode)
                Sys.puts("INFO: data received " + data);
            _self.parsePropfindRequest(data, function(err, requestedProperties) {
                if (err)
                    return _self.handleError(err);
                var depth = _self.getHTTPDepth(1);
                // The only two options for the depth of a propfind is 0 or 1
                if (depth != 0)
                    depth = 1;

                // The requested path
                try {
                    var path = _self.getRequestUri();
                }
                catch(ex) {
                    return _self.handleError(ex);
                }

                _self.getPropertiesForPath(path, requestedProperties, depth, function(err, newProperties) {
                    if (err)
                        return _self.handleError(err);
                    // This is a multi-status response
                    _self.httpResponse.writeHead(207, {"Content-Type": "application/xml; charset=utf-8"});
                    _self.httpResponse.end(_self.generateMultiStatus(newProperties));
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
     * @return void
     */
    this.httpProppatch = function() {
        var _self = this,
            req   = this.httpRequest,
            data  = "";
        req.setEncoding("utf8");
        req.addListener("data", function(chunk) {
            data += chunk;
        });
        req.addListener("end",  function() {
            if (jsDAV.debugMode)
                Sys.puts("INFO: data received " + data);
            _self.parseProppatchRequest(data, function(err, newProperties) {
                if (err)
                    return _self.handleError(err);
                var uri    = _self.getRequestUri(),
                    result = _self.updateProperties(uri, newProperties);

                _self.httpResponse.writeHead(207, {"Content-Type": "application/xml; charset=utf-8"});
                _self.httpResponse.end(_self.generateMultiStatus(result));
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
     * @return void
     */
    this.httpPut = function() {
        var _self = this,
            req   = this.httpRequest,
            data  = "";
        req.setEncoding("utf8"); //@todo what about streams?
        req.addListener("data", function(chunk) {
            data += chunk;
        });
        req.addListener("end",  function() {
            var expected;

            // Intercepting the Finder problem
            if ((expected = req.headers("x-expected-entity-length")) && expected > 0) {
                /*
                Many webservers will not cooperate well with Finder PUT requests,
                because it uses 'Chunked' transfer encoding for the request body.

                The symptom of this problem is that Finder sends files to the
                server, but they arrive as 0-lenght files in PHP.

                If we don't do anything, the user might think they are uploading
                files successfully, but they end up empty on the server. Instead,
                we throw back an error if we detect this.

                The reason Finder uses Chunked, is because it thinks the files
                might change as it's being uploaded, and therefore the
                Content-Length can vary.

                Instead it sends the X-Expected-Entity-Length header with the size
                of the file at the very start of the request. If this header is set,
                but we don't get a request body we will fail the request to
                protect the end-user.
                */
                // Only reading first byte
                var firstByte = fread(data, 1);
                if (firstByte.length !== 1) {
                    throw new Exc.jsDAV_Exception_Forbidden(
                        "This server is not compatible with OS/X finder. Consider "
                        + "using a different WebDAV client or webserver.");
                }

                // The body needs to stay intact, so we copy everything to a
                // temporary stream.
                var newBody = fopen('php://temp','r+');
                fwrite(newBody, firstByte);
                stream_copy_to_stream(data, newBody);
                rewind(newBody);

                data = newBody;
            }

            function createNode() {
                _self.createFile(_self.getRequestUri(), data, function(err) {
                    if (err)
                        return _self.handleError(err);
                    _self.httpResponse.writeHead(201, {"Content-Length": "0"});
                    _self.httpResponse.end();
                });
            }

            // First we'll do a check to see if the resource already exists
            try {
                var node = _self.tree.getNodeForPath(_self.getRequestUri());

                // Checking If-None-Match and related headers.
                if (!_self.checkPreconditions()) return;

                // If the node is a collection, we'll deny it
                if (!node.hasFeature(jsDAV.__IFILE__))
                    throw new Exc.jsDAV_Exception_Conflict("PUT is not allowed on non-files.");
                if (_self.emit("beforeWriteContent", _self.getRequestUri()))
                    return false;

                node.put(data, function(err) {
                    if (err)
                        return createNode(); // If we got here, the resource didn't exist yet.
                    _self.httpResponse.writeHead(200, {"Content-Length": "0"});
                    _self.httpResponse.end();
                });
            }
            catch (ex) {
                // If we got here, the resource didn't exist yet.
                createNode();
            }
        });
    };

    /**
     * WebDAV MKCOL
     *
     * The MKCOL method is used to create a new collection (directory) on the server
     *
     * @return void
     */
    this.httpMkcol = function() {
        var resourceType,
            properties  = {},
            requestBody = this.httpRequest.getBody(true);

        if (requestBody) {
            var contentType = this.httpRequest.headers("Content-Type");
            if (contentType.indexOf("application/xml") !==0 && contentType.indexOf("text/xml") !== 0) {
                // We must throw 415 for unsupport mkcol bodies
                throw new Exc.jsDAV_Exception_UnsupportedMediaType(
                    "The request body for the MKCOL request must have an xml Content-Type");
            }

            var dom = Util.loadDOMDocument(requestBody);
            if (Util.toClarkNotation(dom.firstChild) !== "{DAV:}mkcol") {
                // We must throw 415 for unsupport mkcol bodies
                throw new Exc.jsDAV_Exception_UnsupportedMediaType(
                    "The request body for the MKCOL request must be a {DAV:}mkcol request construct.");
            }

            var childNode,
                c = dom.firstChild.childNodes,
                i = 0,
                l = c.length;
            for (; i < l; ++i) {
                childNode = c[i];
                if (Util.toClarkNotation(childNode) !== "{DAV:}set") continue;
                properties = Util.extend(properties, Util.parseProperties(childNode, this.propertyMap));
            }
            if (!properties["{DAV:}resourcetype"])
                throw new Exc.jsDAV_Exception_BadRequest("The mkcol request must include a {DAV:}resourcetype property");

            delete properties["{DAV:}resourcetype"];

            resourceType = [];
            // Need to parse out all the resourcetypes
            var rtNode = dom.firstChild.getElementsByTagNameNS("urn:DAV", "resourcetype")[0];
            for (i = 0, l = rtNode.childNodes.length; i < l; ++i) {
                childNode = rtNode.childNodes[i];
                resourceType.push(Util.toClarkNotation(childNode));
            }
        }
        else {
            resourceType = ["{DAV:}collection"];
        }

        var result = this.createCollection(this.getRequestUri(), resourceType, properties);

        if (result && result.length) {
            this.httpResponse.writeHead(207, {"Content-Type": "application/xml; charset=utf-8"});
            this.httpResponse.end(this.generateMultiStatus(result));
        }
        else {
            this.httpResponse.writeHead(201, {"Content-Length": "0"});
            this.httpResponse.end();
        }
    };

    /**
     * WebDAV HTTP MOVE method
     *
     * This method moves one uri to a different uri. A lot of the actual request
     * processing is done in getCopyMoveInfo
     *
     * @return void
     */
    this.httpMove = function() {
        try {
            var moveInfo = this.getCopyAndMoveInfo();
        }
        catch (ex) {
            return this.handleError(ex);
        }
        var _self = this;

        if (moveInfo["destinationExists"]) {
            if (this.emit("beforeUnbind", moveInfo["destination"]))
                return false;
            moveInfo["destinationNode"]["delete"](function(err) {
                if (err)
                    return _self.handleError(err);
                afterDelete();
            });
        }
        else {
            afterDelete();
        }

        function afterDelete() {
            if (_self.emit("beforeUnbind", moveInfo["source"])
             || _self.emit("beforeBind",   moveInfo["destination"]))
                return false;
            _self.tree.move(moveInfo["source"], moveInfo["destination"], function (err) {
                if (err)
                    return _self.handleError(err);
                _self.emit("afterBind", moveInfo["destination"]);

                // If a resource was overwritten we should send a 204, otherwise a 201
                _self.httpResponse.writeHead(moveInfo["destinationExists"] ? 204 : 201,
                    {"Content-Length": "0"});
                _self.httpResponse.end();
            });
        }
    };

    /**
     * WebDAV HTTP COPY method
     *
     * This method copies one uri to a different uri, and works much like the MOVE request
     * A lot of the actual request processing is done in getCopyMoveInfo
     *
     * @return void
     */
    this.httpCopy = function() {
        try {
            var copyInfo = this.getCopyAndMoveInfo();
        }
        catch (ex) {
            this.handleError(ex);
        }
        var _self = this;
        
        if (copyInfo["destinationExists"]) {
            if (this.emit("beforeUnbind", copyInfo["destination"]))
                return false;
            copyInfo["destinationNode"]["delete"](function(err) {
                if (err)
                    return _self.handleError(err);
                afterDelete();
            });
        }
        else {
            afterDelete();
        }

        function afterDelete() {
            if (_self.emit("beforeBind", copyInfo["destination"]))
                return false;
            _self.tree.copy(copyInfo["source"], copyInfo["destination"], function(err) {
                if (err)
                    return _self.handleError(err);
                _self.emit("afterBind", copyInfo["destination"]);

                // If a resource was overwritten we should send a 204, otherwise a 201
                _self.httpResponse.writeHead(copyInfo["destinationExists"] ? 204 : 201,
                    {"Content-Length": "0"});
                _self.httpResponse.end();
            });
        }
    };

    /**
     * HTTP REPORT method implementation
     *
     * Although the REPORT method is not part of the standard WebDAV spec (it's from rfc3253)
     * It's used in a lot of extensions, so it made sense to implement it into the core.
     *
     * @return void
     */
    this.httpReport = function() {
        var _self = this,
            req   = this.httpRequest,
            data  = "";
        req.setEncoding("utf8");
        req.addListener("data", function(chunk) {
            data += chunk;
        });
        req.addListener("end",  function() {
            var dom        = Util.loadDOMDocument(data),
                reportName = Util.toClarkNotation(dom.firstChild);

            if (_self.emit("report", reportName, dom)) {
                // If broadcastEvent returned true, it means the report was not supported
                return _self.handleError(new Exc.jsDAV_Exception_ReportNotImplemented());
            }
        });
    };

    /**
     * Returns an array with all the supported HTTP methods for a specific uri.
     *
     * @param  {String} uri
     * @return {Array}
     */
    this.getAllowedMethods = function(uri, callback) {
        var _self   = this,
            methods = [
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
        this.tree.getNodeForPath(uri, function(err, node) {
            if (err)
                methods.push("MKCOL");

            // We're also checking if any of the plugins register any new methods
            for (var plugin in _self.plugins)
                methods = methods.concat(plugin.getHTTPMethods(uri));

            callback(null, Util.makeUnique(methods));
        });
    };

    /**
     * Gets the uri for the request, keeping the base uri into consideration
     *
     * @return string
     */
    this.getRequestUri = function() {
        return this.calculateUri(this.httpRequest.url);
    };

    /**
     * Calculates the uri for a request, making sure that the base uri is stripped out
     *
     * @param {String} uri
     * @throws jsDAV_Exception_Forbidden A permission denied exception is thrown
     *         whenever there was an attempt to supply a uri outside of the base uri
     * @return {String}
     */
    this.calculateUri = function(uri) {
        if (uri.charAt(0) != "/" && uri.indexOf("://") > -1)
            uri = Url.parse(uri).pathname;

        uri = uri.replace("//", "/");

        if (uri.indexOf(this.baseUri) === 0) {
            return Util.trim(unescape(uri.substr(this.baseUri.length)), "/");
        }
        // A special case, if the baseUri was accessed without a trailing
        // slash, we'll accept it as well.
        else if (uri + "/" === this.baseUri) {
            return "";
        }
        else {
            throw new Exc.jsDAV_Exception_Forbidden('Requested uri (' + uri
                + ') is out of base uri (' + this.baseUri + ')');
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
     * @return bool
     */
    this.checkPreconditions = function(handleAsGET) {
        handleAsGET = handleAsGET || false;
        var ifMatch, ifNoneMatch, ifModifiedSince, ifUnmodifiedSince,
            uri     = this.getRequestUri(),
            node    = null,
            lastMod = null,
            etag    = null;

        if (ifMatch = this.httpRequest.headers["if-match"]) {
            // If-Match contains an entity tag. Only if the entity-tag
            // matches we are allowed to make the request succeed.
            // If the entity-tag is '*' we are only allowed to make the
            // request succeed if a resource exists at that url.
            try {
                node = this.tree.getNodeForPath(uri);
            }
            catch (ex) {
                throw new Exc.jsDAV_Exception_PreconditionFailed(
                    "An If-Match header was specified and the resource did not exist",
                    "If-Match");
            }

            // Only need to check entity tags if they are not *
            if (ifMatch !== "*") {
                // The Etag is surrounded by double-quotes, so those must be
                // stripped.
                ifMatch = Util.trim(ifMatch, '"');
                etag    = node.getETag();
                if (etag !== ifMatch) {
                     throw new Exc.jsDAV_Exception_PreconditionFailed(
                        "An If-Match header was specified, but the ETag did not match",
                        "If-Match");
                }
            }
        }

        if (ifNoneMatch = this.httpRequest.headers["if-none-match"]) {
            // The If-None-Match header contains an etag.
            // Only if the ETag does not match the current ETag, the request will succeed
            // The header can also contain *, in which case the request
            // will only succeed if the entity does not exist at all.
            var nodeExists = true;
            if (!node) {
                try {
                    node = this.tree.getNodeForPath(uri);
                }
                catch (ex) {
                    nodeExists = false;
                }
            }
            if (nodeExists) {
                // The Etag is surrounded by double-quotes, so those must be
                // stripped.
                ifNoneMatch = Util.trim(ifNoneMatch, '"');
                if (ifNoneMatch === "*" || ((etag = node.getETag()) && etag === ifNoneMatch)) {
                    if (handleAsGET) {
                        this.httpResponse.writeHead(304);
                        this.httpResponse.end();
                        return false;
                    }
                    else {
                        throw new Exc.jsDAV_Exception_PreconditionFailed(
                            "An If-None-Match header was specified, but the ETag "
                          + "matched (or * was specified).", "If-None-Match");
                    }
                }
            }
        }

        if (!ifNoneMatch && (ifModifiedSince = this.httpRequest.headers["if-modified-since"])) {
            // The If-Modified-Since header contains a date. We
            // will only return the entity if it has been changed since
            // that date. If it hasn't been changed, we return a 304
            // header
            // Note that this header only has to be checked if there was no
            // If-None-Match header as per the HTTP spec.
            var date = new DateTime(ifModifiedSince);

            if (!node)
                node = this.tree.getNodeForPath(uri);
            lastMod = node.getLastModified();
            if (lastMod) {
                lastMod = new Date("@" + lastMod);
                if (lastMod <= date) {
                    this.httpResponse.writeHead(304);
                    this.httpResponse.end();
                    return false;
                }
            }
        }

        if (ifUnmodifiedSince = this.httpRequest.headers["if-unmodified-since"]) {
            // The If-Unmodified-Since will allow allow the request if the
            // entity has not changed since the specified date.
            date = new Date(ifUnmodifiedSince);
            if (!node)
                node = this.tree.getNodeForPath(uri);
            lastMod = node.getLastModified();
            if (lastMod) {
                lastMod = new Date("@" + lastMod);
                if (lastMod > date) {
                    throw new Exc.jsDAV_Exception_PreconditionFailed(
                        "An If-Unmodified-Since header was specified, but the "
                      + "entity has been changed since the specified date.",
                        "If-Unmodified-Since");
                }
            }
        }
        return true;
    };

    /**
     * Generates a WebDAV propfind response body based on a list of nodes
     *
     * @param  {Array} fileProperties The list with nodes
     * @return {String}
     */
    this.generateMultiStatus = function(fileProperties) {
        var namespace, prefix,
            xml = '<?xml version="1.0" encoding="utf-8"?><d:multistatus';

        // Adding in default namespaces
        for (prefix in this.xmlNamespaces) {
            namespace = this.xmlNamespaces[prefix];
            xml += ' xmlns:' + prefix + '="' + namespace + '"';
        }

        xml += ">";

        for (var entry, href, response, i = 0, l = fileProperties.length; i < l; ++i) {
            entry = fileProperties[i];
            href = entry["href"];
            delete entry["href"];

            response = new jsDAV_Property_Response(href, entry);
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
    this.getHTTPHeaders = function(path, callback) {
        var header, prop,
            propertyMap = {
                "{DAV:}getcontenttype"   : "Content-Type",
                "{DAV:}getcontentlength" : "Content-Length",
                "{DAV:}getlastmodified"  : "Last-Modified",
                "{DAV:}getetag"          : "ETag"
            },
            headers    = {};
        this.getProperties(path, ["{DAV:}getcontenttype", "{DAV:}getcontentlength",
            "{DAV:}getlastmodified", "{DAV:}getetag"],
            function(err, properties) {
                if (err)
                    return callback(err, headers);
                for (prop in propertyMap) {
                    header = propertyMap[prop];
                    if (properties[prop]) {
                        // GetLastModified gets special cased
                        if (properties[prop].hasFeature(jsDAV.__PROPGETLASTMODIFIED__)) {
                            headers[header] = properties[prop].getTime().format(Date.RFC1123);
                        }
                        else
                            headers[header] = properties[prop];
                    }
                }
                callback(null, headers);
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
    this.getProperties = function(path, propertyNames, callback) {
        this.getPropertiesForPath(path, propertyNames, 0, function(err, result) {
            if (err)
                return callback(err);
            return callback(null, result[0]["200"])
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
    this.getPropertiesForPath = function(path, propertyNames, depth, callback) {
        propertyNames = propertyNames || [];
        depth         = depth || 0;

        if (depth != 0)
            depth = 1;

        var node, i, l, prop,
            returnPropertyList = [],
            _self              = this;

        this.tree.getNodeForPath(path, function(err, parentNode) {
            if (err)
                return callback(err);

            var nodes = {
                path : parentNode
            };

            if (depth == 1 && parentNode.hasFeature(jsDAV.__ICOLLECTION__)) {
                parentNode.getChildren(function(err, cNodes) {
                    if (err)
                        return callback(err);
                    for (i = 0, l = cNodes.length; i < l; ++i)
                        nodes[path + "/" + cNodes[i].getName()] = cNodes[i];
                    afterGetChildren();
                });
            }
            else {
                afterGetChildren();
            }


            function afterGetChildren() {
                // If the propertyNames array is empty, it means all properties are requested.
                // We shouldn't actually return everything we know though, and only return a
                // sensible list.
                var myPath, newProperties, quotaInfo, etag, ct,
                    allProperties = (propertyNames.length == 0);

                for (myPath in nodes) {
                    node = nodes[myPath];
                    newProperties = {
                        "200" : {},
                        "404" : {}
                    };
                    if (node.hasFeature(jsDAV.__IPROPERTIES__))
                        newProperties["200"] = node.getProperties(propertyNames);

                    if (allProperties) {
                        // Default list of propertyNames, when all properties were requested.
                        propertyNames = [
                            "{DAV:}getlastmodified",
                            "{DAV:}getcontentlength",
                            "{DAV:}resourcetype",
                            "{DAV:}quota-used-bytes",
                            "{DAV:}quota-available-bytes",
                            "{DAV:}getetag",
                            "{DAV:}getcontenttype",
                        ];

                        // We need to make sure this includes any propertyname already
                        // returned from node.getProperties();
                        var keys = [];
                        for (i in newProperties["200"])
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
                    if (Util.arrayIndexOf(propertyNames, "{DAV:}resourcetype") == -1) {
                        propertyNames.push("{DAV:}resourcetype");
                        removeRT = true;
                    }

                    for (i = 0, l = propertyNames.length; i < l; ++i) {
                        prop = propertyNames[i];
                        if (newProperties["200"][prop]) continue;

                        switch (prop) {
                            case "{DAV:}getlastmodified"       :
                                if (node.getLastModified())
                                    newProperties[200][prop] = new jsDAV_Property_GetLastModified(node.getLastModified());
                            break;
                            case "{DAV:}getcontentlength"      :
                                if (node.hasFeature(jsDAV.__IFILE__))
                                    newProperties["200"][prop] = parseInt(node.getSize());
                            break;
                            case "{DAV:}resourcetype"          :
                                newProperties["200"][prop] = new jsDAV_Property_ResourceType(
                                    node.hasFeature(jsDAV.__ICOLLECTION__)
                                        ? Server.NODE_DIRECTORY
                                        : Server.NODE_FILE);
                            break;
                            case "{DAV:}quota-used-bytes"      :
                                if (node.hasFeature(jsDAV.__IQUOTA__)) {
                                    quotaInfo = node.getQuotaInfo();
                                    newProperties["200"][prop] = quotaInfo[0];
                                }
                                break;
                            case "{DAV:}quota-available-bytes" :
                                if (node.hasFeature(jsDAV.__IQUOTA__)) {
                                    quotaInfo = node.getQuotaInfo();
                                    newProperties["200"][prop] = quotaInfo[1];
                                }
                                break;
                            case "{DAV:}getetag"               :
                                if (node.hasFeature(jsDAV.__IFILE__) && (etag = node.getETag()))
                                    newProperties["200"][prop] = etag;
                            break;
                            case "{DAV:}getcontenttype"        :
                                if (node.hasFeature(jsDAV.__IFILE__) && (ct = node.getContentType()))
                                    newProperties["200"][prop] = ct;
                                break;
                            case "{DAV:}supported-report-set"  :
                                newProperties["200"][prop] = new jsDAV_Property_SupportedReportSet();
                            break;
                        }

                        // If we were unable to find the property, we will list it as 404.
                        if (!allProperties && !newProperties["200"][prop])
                            newProperties["404"][prop] = null;

                    }

                    _self.emit("afterGetProperties", [Util.trim(myPath, "/"), newProperties]);

                    newProperties["href"] = trim(myPath, "/");

                    // Its is a WebDAV recommendation to add a trailing slash to collectionnames.
                    // Apple's iCal also requires a trailing slash for principals (rfc 3744).
                    // Therefore we add a trailing / for any non-file. This might need adjustments
                    // if we find there are other edge cases.
                    if (myPath != "" && newProperties["200"]["{DAV:}resourcetype"]
                      && newProperties["200"]["{DAV:}resourcetype"].getValue() !== null)
                        newProperties["href"] += "/";

                    // If the resourcetype property was manually added to the requested property list,
                    // we will remove it again.
                    if (removeRT)
                        delete newProperties["200"]["{DAV:}resourcetype"];

                    returnPropertyList.push(newProperties);
                }

                callback(null, returnPropertyList);
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

        return [
            matches[1] ? matches[1] : null,
            matches[2] ? matches[2] : null,
        ];
    };

    /**
     * Returns the HTTP depth header
     *
     * This method returns the contents of the HTTP depth request header. If the
     * depth header was 'infinity' it will return the jsDAV_Server.DEPTH_INFINITY object
     * It is possible to supply a default depth value, which is used when the depth
     * header has invalid content, or is completely non-existant
     *
     * @param  {mixed}   default
     * @return {Number}
     */
    this.getHTTPDepth = function(def) {
        def = def || Server.DEPTH_INFINITY;
        // If its not set, we'll grab the default
        var depth = this.httpRequest.headers["depth"];
        if (!depth)
            return def;

        if (depth == "infinity")
            return Server.DEPTH_INFINITY;

        // If its an unknown value. we'll grab the default
        if (typeof depth != "number")
            return def;

        return parseInt(depth);
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
    this.parsePropfindRequest = function(body) {
        // If the propfind body was empty, it means IE is requesting 'all' properties
        if (!body)
            return [];

        var oXml = Util.loadDOMDocument(body),
            elem = oXml.getElementsByTagNameNS("urn:DAV", "propfind")[0];
        // @todo xml parser implementation

        return array_keys(Util.parseProperties(elem));
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
     * @param  {String} body Xml body
     * @return {Object} list of properties in need of updating or deletion
     */
    this.parseProppatchRequest = function(body) {
        //We'll need to change the DAV namespace declaration to something else
        //in order to make it parsable
        var child, operation, innerProperties, propertyName, propertyValue,
            dom           = Util.loadDOMDocument(body),
            c             = dom.firstChild.childNodes,
            i             = 0,
            l             = c.length,
            newProperties = {};

        for (; i < l; ++i) {
            child = c[i];
            if (child.nodeType !== 1) continue;

            operation = Util.toClarkNotation(child);
            if (operation !== "{DAV:}set" && operation !== "{DAV:}remove") continue;

            innerProperties = Util.parseProperties(child, this.propertyMap);
            for (propertyName in innerProperties) {
                propertyValue = innerProperties[propertyName];
                if (operation === "{DAV:}remove")
                    propertyValue = null;
                newProperties[propertyName] = propertyValue;
            }
        }
        return newProperties;
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
    this.updateProperties = function(uri, properties) {
        // we'll start by grabbing the node, this will throw the appropriate
        // exceptions if it doesn't.
        var propertyName, status, props,
            node     = this.tree.getNodeForPath(uri),
            result   = {
                "200" : [],
                "403" : [],
                "424" : []
            },
            remainingProperties = properties,
            hasError = false;

        // If the node is not an instance of jsDAV_IProperties, every
        // property is 403 Forbidden
        // simply return a 405.
        if (!node.hasFeature(jsDAV.__IPROPERTIES__)) {
            hasError = true;
            for (propertyName in properties)
                result["403"][propertyName] = null;
            remainingProperties = {};
        }

        // Running through all properties to make sure none of them are protected
        if (!hasError) {
            for (propertyName in properties) {
                if (Util.arrayIndexOf(this.protectedProperties, propertyName) > -1) {
                    result["403"][propertyName] = null;
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
                    result["200"][propertyName] = null;
            }
            else if (updateResult === false) {
                // The node failed to update the properties for an
                // unknown reason
                foreach (propertyName in properties)
                    result["403"][propertyName] = null;
            }
            else if (typeof updateResult == "object") {
                // The node has detailed update information
                result = updateResult;
            }
            else {
                throw new Exc.jsDAV_Exception('Invalid result from updateProperties');
            }

        }

        for (propertyName in remainingProperties) {
            // if there are remaining properties, it must mean
            // there's a dependency failure
            result["424"][propertyName] = null;
        }

        // Removing empty array values
        for (status in result) {
            props = result[status];
            if (props.length === 0)
                delete result[status];
        }
        result["href"] = uri;
        return result;
    };

    /**
     * This method is invoked by sub-systems creating a new file.
     *
     * Currently this is done by HTTP PUT and HTTP LOCK (in the Locks_Plugin).
     * It was important to get this done through a centralized function,
     * allowing plugins to intercept this using the beforeCreateFile event.
     *
     * @param {String} uri
     * @param {Buffer} data
     * @return {void}
     */
    this.createFile = function(uri, data) {
        var parts = Util.splitPath(uri),
            dir   = parts[0],
            name  = parts[1];

        if (this.emit("beforeBind", uri)) return;
        if (this.emit("beforeCreateFile", uri, data)) return;

        var parent = this.tree.getNodeForPath(dir);
        parent.createFile(name, data);

        this.emit('afterBind', uri);
    };

    /**
     * This method is invoked by sub-systems creating a new directory.
     *
     * @param  {String} uri
     * @return {void}
     */
    this.createDirectory = function(uri) {
        return this.createCollection(uri, ["{DAV:}collection"], {});
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
    this.createCollection = function(uri, resourceType, properties) {
        var path      = Util.splitPath(uri),
            parentUri = path[0],
            newName   = path[1];

        // Making sure {DAV:}collection was specified as resourceType
        if (Util.arrayIndexOf(resourceType, "{DAV:}collection") == -1) {
            throw new Exc.jsDAV_Exception_InvalidResourceType(
                "The resourceType for this collection must at least include {DAV:}collection");
        }

        // Making sure the parent exists
        try {
            var parent = this.tree.getNodeForPath(parentUri);
        }
        catch (ex) {
            throw new Exc.jsDAV_Exception_Conflict("Parent node does not exist");
        }

        // Making sure the parent is a collection
        if (!parent.hasFeature(jsDAV.__ICOLLECTION__))
            throw new Exc.jsDAV_Exception_Conflict("Parent node is not a collection");

        // Making sure the child does not already exist
        try {
            parent.getChild(newName);
            // If we got here.. it means there's already a node on that url,
            // and we need to throw a 405
            throw new Exc.jsDAV_Exception_MethodNotAllowed("The resource you tried to create already exists");
        }
        catch (ex) {
            if (!ex.type != "jsDAV_Exception_MethodNotAllowed")
                throw ex;
        }

        if (this.emit("beforeBind", uri)) return;

        // There are 2 modes of operation. The standard collection
        // creates the directory, and then updates properties
        // the extended collection can create it directly.
        if (parent.hasFeature(jsDAV.__IEXTCOLLECTION__)) {
            parent.createExtendedCollection(newName, resourceType, properties);
        }
        else {
            // No special resourcetypes are supported
            if (resourceType.length > 1) {
                throw new Exc.jsDAV_Exception_InvalidResourceType(
                    "The {DAV:}resourcetype you specified is not supported here.");
            }
            parent.createDirectory(newName);
            var rollBack    = false,
                exception   = null,
                errorResult = null;

            if (properties.length > 0) {
                try {
                    errorResult = this.updateProperties(uri, properties);
                    if (!isset(errorResult["200"]))
                        rollBack = true;
                }
                catch (ex) {
                    rollBack = true;
                    exception = ex;
                }
            }

            if (rollBack) {
                var node = this.tree.getNodeForPath(uri);
                if (this.emit("beforeUnbind", uri)) return;
                node["delete"]();

                // Re-throwing exception
                if (exception)
                    throw exception;

                return errorResult;
            }
        }
        this.emit("afterBind", uri);
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
    this.getCopyAndMoveInfo = function() {
        var destinationParent, destinationNode,
            source = this.getRequestUri();

        // Collecting the relevant HTTP headers
        if (!this.httpRequest.headers["destination"])
            throw new Exc.jsDAV_Exception_BadRequest("The destination header was not supplied");
        
        var destination = this.calculateUri(this.httpRequest.headers["destination"]),
            overwrite   = this.httpRequest.headers["overwrite"];
        if (!overwrite)
            overwrite = "T";
        if (overwrite.toUpperCase() == "T")
            overwrite = true;
        else if (overwrite.toUpperCase() == "F")
            overwrite = false;
        // We need to throw a bad request exception, if the header was invalid
        else
            throw new Exc.jsDAV_Exception_BadRequest("The HTTP Overwrite header should be either T or F");

        var destinationDir = Util.splitPath(destination)[0];

        // Collection information on relevant existing nodes
        var sourceNode = this.tree.getNodeForPath(source);

        try {
            destinationParent = this.tree.getNodeForPath(destinationDir);
            if (!destinationParent.hasFeature(jsDAV.__ICOLLECTION__))
                throw new Exc.jsDAV_Exception_UnsupportedMediaType("The destination node is not a collection");
        }
        catch (ex) {
            // If the destination parent node is not found, we throw a 409
            throw (ex.type == "jsDAV_Exception_FileNotFound")
                ? new Exc.jsDAV_Exception_Conflict("The destination node is not found")
                : ex;
        }

        try {
            destinationNode = this.tree.getNodeForPath(destination);
            // If this succeeded, it means the destination already exists
            // we"ll need to throw precondition failed in case overwrite is false
            if (!overwrite)
                throw new Exc.jsDAV_Exception_PreconditionFailed(
                    "The destination node already exists, and the overwrite header is set to false",
                    "Overwrite");
        }
        catch (ex) {
            // Destination didn't exist, we're all good
            if (ex.type == "jsDAV_Exception_FileNotFound")
                destinationNode = false;
            else
                throw ex;
        }

        // These are the three relevant properties we need to return
        return {
            "source"            : source,
            "destination"       : destination,
            "destinationExists" : (destinationNode == true),
            "destinationNode"   : destinationNode
        };
    };

    /**
     * Returns a full HTTP status message for an HTTP status code
     *
     * @param {Number} code
     * @return {string}
     */
    this.getStatusMessage = function(code) {
        code = String(code);
        return "HTTP/1.1 " + code + " " + Server.STATUS_MAP[code];
    };
}).call(Server.prototype = Http.Server.prototype);

exports.createServer = function(options, port, host) {
    port = port || exports.DEFAULT_PORT;
    host = host || exports.DEFAULT_HOST;

    var server = new Server(options);
    server.listen(port, host, function() {
        Sys.puts("jsDAV server running on '" + host + "' port " + port);
    });
    return server;
};

