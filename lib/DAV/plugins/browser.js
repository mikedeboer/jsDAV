/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
var jsDAV              = require("./../../jsdav"),
    jsDAV_Server       = require("./../server"),
    jsDAV_ServerPlugin = require("./../plugin").jsDAV_ServerPlugin,

    Exc  = require("./../exceptions"),
    Util = require("./../util");

/**
 * Browser Plugin
 *
 * This plugin provides a html representation, so that a WebDAV server may be accessed
 * using a browser.
 *
 * The class intercepts GET requests to collection resources and generates a simple 
 * html index. 
 */
function jsDAV_Browser_Plugin(handler) {
    this.handler = handler;
    this.enablePost = false; //not implemented ATM
    this.initialize();
}

(function() {
    this.initialize = function() {
        this.handler.addEventListener("beforeMethod", this.httpGetInterceptor.bind(this));
        if (this.enablePost)
            this.handler.addEventListener("unknownMethod", this.httpPOSTHandler.bind(this));
    };

    /**
     * This method intercepts GET requests to collections and returns the html
     *
     * @param string method
     * @return bool
     */
    this.httpGetInterceptor = function(e, method) {
        if (method != "GET")
            return e.next();

        var uri   = this.handler.getRequestUri(),
            _self = this;
        this.handler.server.tree.getNodeForPath(uri, function(err, node) {
            if (err || node.hasFeature(jsDAV.__IFILE__))
                return e.next();

            _self.generateDirectoryIndex(_self.handler.getRequestUri(), function(err, sIndex) {
                if (err)
                    return e.next(err);
                _self.handler.httpResponse.writeHead(200, {"Content-Type":"text/html; charset=utf-8"});
                _self.handler.httpResponse.end(sIndex);
                e.stop();
            });
        });
    };

    /**
     * Handles POST requests for tree operations
     *
     * This method is not yet used.
     *
     * @param string method
     * @return bool
     */
    this.httpPOSTHandler = function(method, cbposthandler) {
        /*if (method != "POST")
            return true;
        if (isset(_POST["action"])) {
            switch(_POST["action"]) {
                case "mkcol" :
                    if (isset(_POST["name"]) && trim(_POST["name"])) {
                        // Using basename() because we won"t allow slashes
                        folderName = Util.splitPath(trim(_POST["name"]))[1];
                        this.server.createDirectory(this.server.getRequestUri() + "/" + folderName);
                    }
                    break;
                case "put" :
                    if (_FILES) file = current(_FILES);
                    else break;
                    newName = trim(file["name"]);
                    newName = Util.splitPath(trim(file["name"]))[1];
                    if (isset(_POST["name"]) && trim(_POST["name"]))
                        newName = trim(_POST["name"]);

                    // Making sure we only have a 'basename' component
                    newName = jsDAV_URLUtil.splitPath(newName)[1];
                    if (is_uploaded_file(file["tmp_name"])) {
                        parent = this.server.tree.getNodeForPath(trim(this.server.getRequestUri(),"/"));
                        parent.createFile(newName,fopen(file["tmp_name"],"r"));
                    }
            }
        }
        this.server.httpResponse.setHeader("Location",this.server.httpRequest.getUri());
        return false;*/
    };

    /**
     * Escapes a string for html.
     *
     * @param string value
     * @return void
     */
    this.escapeHTML = function(value) {
        return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    };

    /**
     * Generates the html directory index for a given url
     *
     * @param string path
     * @return string
     */
    this.generateDirectoryIndex = function(path, cbindex) {
        var _self = this,
            html  = "<html>\n\
<head>\n\
  <title>Index for " + this.escapeHTML(path) + "/ - jsDAV " + jsDAV_Server.VERSION + "</title>\n\
  <style type=\"text/css\"> body { Font-family: arial}</style>\n\
</head>\n\
<body>\n\
  <h1>Index for " + this.escapeHTML(path) + "/</h1>\n\
  <table>\n\
    <tr><th>Name</th><th>Type</th><th>Size</th><th>Last modified</th></tr>\n\
    <tr><td colspan=\"4\"><hr /></td></tr>\n";

        _self.handler.getPropertiesForPath(path, [
            "{DAV:}resourcetype",
            "{DAV:}getcontenttype",
            "{DAV:}getcontentlength",
            "{DAV:}getlastmodified"
          ], 1, function(err, files) {
            if (err)
                return cbindex(err);
            var file, name, type, size, lastmodified, fullPath;
            for (var filename in files) {
                file = files[filename];
                // This is the current directory, we can skip it
                if (Util.rtrim(file["href"], "/") == path)
                    continue;

                name = _self.escapeHTML(Util.splitPath(file["href"])[1] || "");

                type = null;
                if (!Util.empty(file["200"]["{DAV:}resourcetype"])) {
                    type = file["200"]["{DAV:}resourcetype"].getValue();

                    // resourcetype can have multiple values
                    if (type instanceof Array)
                        type = type.join(", ");

                    // Some name mapping is preferred
                    if (type == "{DAV:}collection")
                        type = "Collection";
                }

                // If no resourcetype was found, we attempt to use
                // the contenttype property
                if (!type && !Util.empty(file["200"]["{DAV:}getcontenttype"])) {
                    type = file["200"]["{DAV:}getcontenttype"];
                }
                if (!type)
                    type = "Unknown";

                type = _self.escapeHTML(type.replace(/;.*$/, ""));
                size = !Util.empty(file["200"]["{DAV:}getcontentlength"])
                    ? parseInt(file["200"]["{DAV:}getcontentlength"], 10)
                    : "";
                lastmodified = !Util.empty(file["200"]["{DAV:}getlastmodified"])
                    ? Util.dateFormat(file["200"]["{DAV:}getlastmodified"].getTime(), Util.DATE_RFC822)
                    : "";

                fullPath = encodeURI("/" + Util.trim(_self.handler.server.getBaseUri() + (path ? path + "/" : "") + name, "/"));

                html += "<tr>\
<td><a href=\"" + fullPath + "\">" + name + "</a></td>\n\
<td>" + type + "</td>\n\
<td>" + size + "</td>\n\
<td>" + lastmodified + "</td>\n\
</tr>\n";

            }

            html += "<tr><td colspan=\"4\"><hr /></td></tr>\n";

            if (_self.enablePost) {
                html += '<tr><td><form method="post" action="">\n\
            <h3>Create new folder</h3>\n\
            <input type="hidden" name="action" value="mkcol" />\n\
            Name: <input type="text" name="name" /><br />\n\
            <input type="submit" value="create" />\n\
            </form>\n\
            <form method="post" action="" enctype="multipart/form-data">\n\
            <h3>Upload file</h3>\n\
            <input type="hidden" name="action" value="put" />\n\
            Name (optional): <input type="text" name="name" /><br />\n\
            File: <input type="file" name="file" /><br />\n\
            <input type="submit" value="upload" />\n\
            </form>\n\
       </td></tr>\n';
            }

            html += "</table>\n\
  <address>Generated by jsDAV " + jsDAV_Server.VERSION + " (c)2010 <a href=\"http://github.com/mikedeboer/jsdav\">http://github.com/mikedeboer/jsDAV</a></address>\n\
</body>\n\
</html>\n";
            cbindex(null, html);
        });
    };
}).call(jsDAV_Browser_Plugin.prototype = new jsDAV_ServerPlugin());

module.exports = jsDAV_Browser_Plugin;
