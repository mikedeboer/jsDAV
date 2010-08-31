/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var Xml = require("./../../vendor/node-xml/lib/node-xml"),
    Exc = require("./exceptions");

/**
 * Make sure that an array instance contains only unique values (NO duplicates).
 *
 * @type {Array}
 */
exports.makeUnique = function(arr){
    var i, length, newArr = [];
    for (i = 0, length = arr.length; i < length; i++)
        if (newArr.indexOf(arr[i]) == -1)
            newArr.push(arr[i]);

    arr.length = 0;
    for (i = 0, length = newArr.length; i < length; i++)
        arr.push(newArr[i]);

    return arr;
};

exports.hashCount = function(obj) {
    return exports.hasKeys(obj).length;
};

exports.hashValues = function(obj) {
    var res = [];
    if (!("hasOwnProperty" in obj))
        return res;
    for (var i in obj) {
        if (obj.hasOwnProperty(i))
            res.push(obj[i]);
    }
    return res;
};

exports.hashKeys = function(obj) {
    var res = [];
    if (!("hasOwnProperty" in obj))
        return res;
    for (var i in obj) {
        if (obj.hasOwnProperty(i))
            res.push(i);
    }
    return res;
};

exports.trim = function(str, charlist) {
    // Strips whitespace from the beginning and end of a string
    var whitespace, l = 0, i = 0;
    str += "";

    if (!charlist) {
        // default list
        whitespace = " \n\r\t\f\x0b\xa0\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u200b\u2028\u2029\u3000";
    } else {
        // preg_quote custom list
        charlist += "";
        whitespace = charlist.replace(/([\[\]\(\)\.\?\/\*\{\}\+\$\^\:])/g, "$1");
    }

    l = str.length;
    for (i = 0; i < l; i++) {
        if (whitespace.indexOf(str.charAt(i)) === -1) {
            str = str.substring(i);
            break;
        }
    }

    l = str.length;
    for (i = l - 1; i >= 0; i--) {
        if (whitespace.indexOf(str.charAt(i)) === -1) {
            str = str.substring(0, i + 1);
            break;
        }
    }

    return whitespace.indexOf(str.charAt(0)) === -1 ? str : "";
};

exports.rtrim = function(str, charlist) {
    charlist = !charlist ? " \\s\u00A0" : (charlist+"").replace(/([\[\]\(\)\.\?\/\*\{\}\+\$\^\:])/g, "\\$1");
    var re = new RegExp("[" + charlist + "]+$", "g");
    return (str+"").replace(re, "");
};

/**
 * Extends an object with one or more other objects by copying all their
 * properties.
 * @param {Object} dest the destination object.
 * @param {Object} src the object that is copies from.
 * @return {Object} the destination object.
 */
exports.extend = function(dest, src){
    var prop, i, x = !dest.notNull;
    if (arguments.length == 2) {
        for (prop in src) {
            if (x || src[prop])
                dest[prop] = src[prop];
        }
        return dest;
    }

    for (i = 1; i < arguments.length; i++) {
        src = arguments[i];
        for (prop in src) {
            if (x || src[prop])
                dest[prop] = src[prop];
        }
    }
    return dest;
};

/**
 * Returns the 'dirname' and 'basename' for a path.
 *
 * The reason there is a custom function for this purpose, is because
 * basename() is locale aware (behaviour changes if C locale or a UTF-8 locale is used)
 * and we need a method that just operates on UTF-8 characters.
 *
 * In addition basename and dirname are platform aware, and will treat backslash (\) as a
 * directory separator on windows.
 *
 * This method returns the 2 components as an array.
 *
 * If there is no dirname, it will return an empty string. Any / appearing at the end of the
 * string is stripped off.
 *
 * @param {string} path
 * @return array
 */
exports.splitPath = function(path) {
    var matches = path.match(/^(?:(?:(.*)(?:\/+))?([^\/]+))(?:\/?)$/gi);
    return matches && matches.length ? [matches[1], matches[2]] : [null, null];
};

/**
 * Returns the 'clark notation' for an element.
 *
 * For example, and element encoded as:
 * <b:myelem xmlns:b="http://www.example.org/" />
 * will be returned as:
 * {http://www.example.org}myelem
 *
 * This format is used throughout the SabreDAV sourcecode.
 * Elements encoded with the urn:DAV namespace will
 * be returned as if they were in the DAV: namespace. This is to avoid
 * compatibility problems.
 *
 * This function will return null if a nodetype other than an Element is passed.
 *
 * @param DOMElement dom
 * @return string
 */
exports.toClarkNotation = function(dom) {
    if (!dom.nodeType)
        dom = {namespaceURI: dom, localName: arguments[1], nodeType: 1};
    if (dom.nodeType !== 1)
        return null;

    // Mapping back to the real namespace, in case it was dav
    var ns = dom.namespaceURI == "urn:DAV" ? "DAV:" : dom.namespaceURI;
    // Mapping to clark notation
    return "{" + ns + "}" + dom.localName;
};

/**
 * This method takes an XML document (as string) and converts all instances of the
 * DAV: namespace to urn:DAV
 *
 * This is unfortunately needed, because the DAV: namespace violates the xml namespaces
 * spec, and causes the DOM to throw errors
 */
exports.convertDAVNamespace = function(xmlDocument) {
    // This is used to map the DAV: namespace to urn:DAV. This is needed, because the DAV:
    // namespace is actually a violation of the XML namespaces specification, and will cause errors
    return xmlDocument.replace(/xmlns(:[A-Za-z0-9_]*)?=("|')DAV:("|')/g, "xmlns$1=$2urn:DAV$2");
};

/**
 * This method provides a generic way to load a DOMDocument for WebDAV use.
 *
 * This method throws a Sabre_DAV_Exception_BadRequest exception for any xml errors.
 * It does not preserve whitespace, and it converts the DAV: namespace to urn:DAV.
 *
 * @param string xml
 * @throws jsDAV_Exception_BadRequest
 * @return DOMDocument
 */
exports.loadDOMDocument = function(xml, callback) {
    if (!xml)
        callback(new Exc.jsDAV_Exception_BadRequest("Empty XML document sent"));

    // The BitKinex client sends xml documents as UTF-16. PHP 5.3.1 (and presumably lower)
    // does not support this, so we must intercept this and convert to UTF-8.
    if (xml.substr(0, 12) === "\x3c\x00\x3f\x00\x78\x00\x6d\x00\x6c\x00\x20\x00") {
        // Note: the preceeding byte sequence is "<?xml" encoded as UTF_16, without the BOM.
        //$xml = iconv('UTF-16LE','UTF-8',$xml);
        // Because the xml header might specify the encoding, we must also change this.
        // This regex looks for the string encoding="UTF-16" and replaces it with
        // encoding="UTF-8".
        //xml = xml.replace(/<\?xml([^>]*)encoding="UTF-16"([^>]*)>/, "<?xml$1encoding=\"UTF-8\"$2>");
    }

    exports.parseString(exports.convertDAVNamespace(xml), function(err, obj) {
        if (err)
            callback(new Exc.jsDAV_Exception_BadRequest("The request body had an invalid XML body. (message: " + err + ")"));
        callback(null, obj);
    });
};

/**
 * Parses all WebDAV properties out of a DOM Element
 *
 * Generally WebDAV properties are encloded in {DAV:}prop elements. This
 * method helps by going through all these and pulling out the actual
 * propertynames, making them array keys and making the property values,
 * well.. the array values.
 *
 * If no value was given (self-closing element) null will be used as the
 * value. This is used in for example PROPFIND requests.
 *
 * Complex values are supported through the propertyMap argument. The
 * propertyMap should have the clark-notation properties as it's keys, and
 * classnames as values.
 *
 * When any of these properties are found, the unserialize() method will be
 * (statically) called. The result of this method is used as the value.
 *
 * @param {DOMElement} parentNode
 * @param {Object} propertyMap
 * @return array
 */
this.parseProperties = function(parentNode, propertyMap) {
    propertyMap = propertyMap || [];
    var propNode, propNodeData, propertyName, j, k, c,
        propList   = {},
        childNodes = parentNode.childNodes(),
        i          = 0,
        l          = childNodes.length;
    for (; i < l; ++i) {
        propNode = childNodes[i];

        if (exports.toClarkNotation(propNode) !== "{DAV:}prop")
            continue;

        for (j = 0, c = propNode.childNodes(), k = c.length; j < k; ++j) {
            propNodeData = c[j];

            // If there are no elements in here, we actually get 1 text node,
            // this special case is dedicated to netdrive
            //if (propNodeData.nodeType != 1) continue;

            propertyName = exports.toClarkNotation(propNodeData);
            if (propertyMap[propertyName]) { //@todo make serializers callable
                propList[propertyName] = propertyMap[propertyName].unserialize(propNodeData);
            }
            else {
                propList[propertyName] = propNodeData.content;
            }
        }
    }
    return propList;
};

var Element = exports.Element = function(parent, prefix, uri, localName) {
    this.namespaceURI = uri       || (parent && parent.namespaceURI) || null;
    this.prefix       = prefix    || (parent && parent.prefix) || null;
    this.localName    = localName || "";
    this.nodeType     = 1;
    var attrs = {};

    this.getParent = function() {
        return parent;
    };

    this.getFirstChild = function() {
        var tag, el;
        for (tag in this) {
            el = this[tag];
            if (el instanceof Element)
                return el;
        }
        return null;
    };

    this.getLastChild = function() {
        var tag, el,
            last = null;
        for (tag in this) {
            el = this[tag];
            if (el instanceof Element)
                last = el;
        }
        return last;
    };

    this.toString = function() {
        return this["content"] || "";
    };

    this.getElementsByTagName = function(tagName) {
        var el,
            res = [];
        for (var tag in this) {
            el = this[tag];
            if (tag != tagName || !(el instanceof Element)) continue;
            res.push(el);
            res = res.concat(el.getElementsByTagName(tagName));
        }
        return res;
    };

    this.getElementsByTagNameNS = function(NS, tagName) {
        var el,
            res = [];
        for (var tag in this) {
            el = this[tag];
            if (tag != tagName || el.namespaceURI != NS || !(el instanceof Element)) continue;
            res.push(el);
            res = res.concat(el.getElementsByTagNameNS(NS, tagName));
        }
        return res;
    };

    this.childNodes = function() {
        var el,
            res = [];
        for (var tag in this) {
            el = this[tag];
            if (!(el instanceof Element)) continue;
            res.push(el);
        }
        return res;
    };

    // this expects it to be in the format:
    // [[key1, value1], [key2, value2]]
    this.setAttrs = function(nAttrs) {
        for (var i in nAttrs) {
            attrs[nAttrs[i][0]] = nAttrs[i][1];
        }
    };

    this.attrs = function() {
        return attrs;
    };

    this.attr = function(key) {
        return attrs[key];
    };
};

exports.parseString = function(string, callback) {
    var parser = new Xml.SaxParser(function(cb) {
        var current_tree,
            err            = null,
            current_object = null;

        // TODO: Make this support prefixes and URIs
        cb.onStartElementNS(function(elem, attrs, prefix, uri, namespaces) {
            // Set up object
            current_object = new Element(current_object, prefix, uri, elem);
            current_object.setAttrs(attrs);

            if (!current_tree)
                current_tree = current_object;

            // Time to insert current_object into parent
            var parent = current_object.getParent();

            // If it has no parent, just return
            if (parent == null) return;

            // Determine how to add to parent
            if (typeof(parent[elem]) === "undefined") {
                // Parent doesn't have this element added yet, so just add it right to it
                parent[elem] = current_object;
            }
            else if(parent[elem].constructor == Array) {
                // Parent already has an array of elems, so just add it
                parent[elem].push(current_object);
            }
            else {
                // It already exists and is an object, so it needs to be converted to an array
                parent[elem] = [parent[elem], current_object];
            }
        });

        cb.onCharacters(addContent);
        cb.onCdata(addContent);

        function addContent(str) {
            if (!current_object)
                return;
            if (typeof(current_object["content"]) == "undefined")
                current_object["content"] = "";
            current_object["content"] += str;
        }

        cb.onEndElementNS(function(elem, prefix, uri) {
            if (current_object.getParent() == null) {
                var obj = {};
                obj[elem] = current_object;
                //callback(null, obj);
            }
            else {
                var p = current_object
                current_object = current_object.getParent();
            }
        });

        cb.onError(function(msg) {
            err = msg;
        });

        cb.onEndDocument(function() {
            return callback(err, current_tree);
        });
    });

    parser.parseString(string);
};

/**
 * Return md5 hash of the given string and optional encoding,
 * defaulting to hex.
 *
 * @param {String} str
 * @param {String} encoding
 * @return {String}
 * @api public
 */

exports.md5 = function(str, encoding){
    return crypto.createHash('md5').update(str).digest(encoding || 'hex');
};

/**
 * Default mime type.
 */

var defaultMime = exports.defaultMime = 'application/octet-stream';

exports.mime = {

      /**
       * Return mime type for the given path,
       * otherwise default to exports.defaultMime
       * ("application/octet-stream").
       *
       * @param {String} path
       * @return {String}
       * @api public
       */
      type: function getMime(path) {
          var index = String(path).lastIndexOf(".");
          if (index < 0) {
              return defaultMime;
          }
          var type = exports.mime.types[path.substring(index).toLowerCase()] || defaultMime;
          return (/(text|javascript)/).test(type)
            ? type + "; charset=utf-8"
            : type;
      },

      /**
       * Mime types.
       */
      types: {
          ".3gp"   : "video/3gpp",
          ".a"     : "application/octet-stream",
          ".ai"    : "application/postscript",
          ".aif"   : "audio/x-aiff",
          ".aiff"  : "audio/x-aiff",
          ".asc"   : "application/pgp-signature",
          ".asf"   : "video/x-ms-asf",
          ".asm"   : "text/x-asm",
          ".asx"   : "video/x-ms-asf",
          ".atom"  : "application/atom+xml",
          ".au"    : "audio/basic",
          ".avi"   : "video/x-msvideo",
          ".bat"   : "application/x-msdownload",
          ".bin"   : "application/octet-stream",
          ".bmp"   : "image/bmp",
          ".bz2"   : "application/x-bzip2",
          ".c"     : "text/x-c",
          ".cab"   : "application/vnd.ms-cab-compressed",
          ".cc"    : "text/x-c",
          ".chm"   : "application/vnd.ms-htmlhelp",
          ".class" : "application/octet-stream",
          ".com"   : "application/x-msdownload",
          ".conf"  : "text/plain",
          ".cpp"   : "text/x-c",
          ".crt"   : "application/x-x509-ca-cert",
          ".css"   : "text/css",
          ".csv"   : "text/csv",
          ".cxx"   : "text/x-c",
          ".deb"   : "application/x-debian-package",
          ".der"   : "application/x-x509-ca-cert",
          ".diff"  : "text/x-diff",
          ".djv"   : "image/vnd.djvu",
          ".djvu"  : "image/vnd.djvu",
          ".dll"   : "application/x-msdownload",
          ".dmg"   : "application/octet-stream",
          ".doc"   : "application/msword",
          ".dot"   : "application/msword",
          ".dtd"   : "application/xml-dtd",
          ".dvi"   : "application/x-dvi",
          ".ear"   : "application/java-archive",
          ".eml"   : "message/rfc822",
          ".eps"   : "application/postscript",
          ".exe"   : "application/x-msdownload",
          ".f"     : "text/x-fortran",
          ".f77"   : "text/x-fortran",
          ".f90"   : "text/x-fortran",
          ".flv"   : "video/x-flv",
          ".for"   : "text/x-fortran",
          ".gem"   : "application/octet-stream",
          ".gemspec" : "text/x-script.ruby",
          ".gif"   : "image/gif",
          ".gz"    : "application/x-gzip",
          ".h"     : "text/x-c",
          ".hh"    : "text/x-c",
          ".htm"   : "text/html",
          ".html"  : "text/html",
          ".ico"   : "image/vnd.microsoft.icon",
          ".ics"   : "text/calendar",
          ".ifb"   : "text/calendar",
          ".iso"   : "application/octet-stream",
          ".jar"   : "application/java-archive",
          ".java"  : "text/x-java-source",
          ".jnlp"  : "application/x-java-jnlp-file",
          ".jpeg"  : "image/jpeg",
          ".jpg"   : "image/jpeg",
          ".js"    : "application/javascript",
          ".json"  : "application/json",
          ".log"   : "text/plain",
          ".m3u"   : "audio/x-mpegurl",
          ".m4v"   : "video/mp4",
          ".man"   : "text/troff",
          ".manifest": "text/cache-manifest",
          ".mathml" : "application/mathml+xml",
          ".mbox"  : "application/mbox",
          ".mdoc"  : "text/troff",
          ".me"    : "text/troff",
          ".mid"   : "audio/midi",
          ".midi"  : "audio/midi",
          ".mime"  : "message/rfc822",
          ".mml"   : "application/mathml+xml",
          ".mng"   : "video/x-mng",
          ".mov"   : "video/quicktime",
          ".mp3"   : "audio/mpeg",
          ".mp4"   : "video/mp4",
          ".mp4v"  : "video/mp4",
          ".mpeg"  : "video/mpeg",
          ".mpg"   : "video/mpeg",
          ".ms"    : "text/troff",
          ".msi"   : "application/x-msdownload",
          ".odp"   : "application/vnd.oasis.opendocument.presentation",
          ".ods"   : "application/vnd.oasis.opendocument.spreadsheet",
          ".odt"   : "application/vnd.oasis.opendocument.text",
          ".ogg"   : "application/ogg",
          ".p"     : "text/x-pascal",
          ".pas"   : "text/x-pascal",
          ".pbm"   : "image/x-portable-bitmap",
          ".pdf"   : "application/pdf",
          ".pem"   : "application/x-x509-ca-cert",
          ".pgm"   : "image/x-portable-graymap",
          ".pgp"   : "application/pgp-encrypted",
          ".pkg"   : "application/octet-stream",
          ".pl"    : "text/x-script.perl",
          ".pm"    : "text/x-script.perl-module",
          ".png"   : "image/png",
          ".pnm"   : "image/x-portable-anymap",
          ".ppm"   : "image/x-portable-pixmap",
          ".pps"   : "application/vnd.ms-powerpoint",
          ".ppt"   : "application/vnd.ms-powerpoint",
          ".ps"    : "application/postscript",
          ".psd"   : "image/vnd.adobe.photoshop",
          ".py"    : "text/x-script.python",
          ".qt"    : "video/quicktime",
          ".ra"    : "audio/x-pn-realaudio",
          ".rake"  : "text/x-script.ruby",
          ".ram"   : "audio/x-pn-realaudio",
          ".rar"   : "application/x-rar-compressed",
          ".rb"    : "text/x-script.ruby",
          ".rdf"   : "application/rdf+xml",
          ".roff"  : "text/troff",
          ".rpm"   : "application/x-redhat-package-manager",
          ".rss"   : "application/rss+xml",
          ".rtf"   : "application/rtf",
          ".ru"    : "text/x-script.ruby",
          ".s"     : "text/x-asm",
          ".sgm"   : "text/sgml",
          ".sgml"  : "text/sgml",
          ".sh"    : "application/x-sh",
          ".sig"   : "application/pgp-signature",
          ".snd"   : "audio/basic",
          ".so"    : "application/octet-stream",
          ".svg"   : "image/svg+xml",
          ".svgz"  : "image/svg+xml",
          ".swf"   : "application/x-shockwave-flash",
          ".t"     : "text/troff",
          ".tar"   : "application/x-tar",
          ".tbz"   : "application/x-bzip-compressed-tar",
          ".tci"   : "application/x-topcloud",
          ".tcl"   : "application/x-tcl",
          ".tex"   : "application/x-tex",
          ".texi"  : "application/x-texinfo",
          ".texinfo" : "application/x-texinfo",
          ".text"  : "text/plain",
          ".tif"   : "image/tiff",
          ".tiff"  : "image/tiff",
          ".torrent" : "application/x-bittorrent",
          ".tr"    : "text/troff",
          ".ttf"   : "application/x-font-ttf",
          ".txt"   : "text/plain",
          ".vcf"   : "text/x-vcard",
          ".vcs"   : "text/x-vcalendar",
          ".vrml"  : "model/vrml",
          ".war"   : "application/java-archive",
          ".wav"   : "audio/x-wav",
          ".wma"   : "audio/x-ms-wma",
          ".wmv"   : "video/x-ms-wmv",
          ".wmx"   : "video/x-ms-wmx",
          ".wrl"   : "model/vrml",
          ".wsdl"  : "application/wsdl+xml",
          ".xbm"   : "image/x-xbitmap",
          ".xhtml"   : "application/xhtml+xml",
          ".xls"   : "application/vnd.ms-excel",
          ".xml"   : "application/xml",
          ".xpm"   : "image/x-xpixmap",
          ".xsl"   : "application/xml",
          ".xslt"  : "application/xslt+xml",
          ".yaml"  : "text/yaml",
          ".yml"   : "text/yaml",
          ".zip"   : "application/zip"
      }
};
