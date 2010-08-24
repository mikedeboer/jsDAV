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
    if (!("isOwnProperty" in obj))
        return res;
    for (var i in obj) {
        if (!obj.isOwnProperty(i))
            res.push(obj[i]);
    }
    return res;
};

exports.hashKeys = function(obj) {
    var res = [];
    if (!("isOwnProperty" in obj))
        return res;
    for (var i in obj) {
        if (!obj.isOwnProperty(i))
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

exports.rtim = function(str, charlist) {
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

exports.arrayIndexOf = function(arr, obj, from){
    var len = arr.length;
    for (var i = (from < 0) ? Math.max(0, len + from) : from || 0; i < len; i++) {
        if (arr[i] === obj)
            return i;
    }
    return -1;
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

    Xml2Object.parseString(exports.convertDAVNamespace(xml), function(err, obj) {
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
 * @param {Array} propertyMap
 * @return array
 */
this.parseProperties = function(parentNode, propertyMap) {
    propertyMap = propertyMap || [];
    var propNode, propNodeData, propertyName, j, k,
        propList = {},
        i        = 0,
        l        = parentNode.childNodes.length;
    for (; i < l; ++i) {
        propNode = parentNode.childNodes[i];

        if (exports.toClarkNotation(propNode) !== "{DAV:}prop")
            continue;

        for (j = 0, k = propNode.childNodes.length; j < k; ++j) {
            propNodeData = propNode.childNodes[j];

            // If there are no elements in here, we actually get 1 text node,
            // this special case is dedicated to netdrive
            if (propNodeData.nodeType != 1) continue;

            propertyName = exports.toClarkNotation(propNodeData);
            if (propertyMap[propertyName]) { //@todo make serializers callable
                propList[propertyName] = propertyMap[propertyName].unserialize(propNodeData);
            }
            else {
                propList[propertyName] = propNodeData.textContent;
            }
        }
    }
    return propList;
};

var Element = function(parent, prefix, uri) {
    this.namespaceURI = uri    || (parent && parent.namespaceURI) || null;
    this.prefix       = prefix || (parent && parent.prefix) || null;
    var attrs = {};

    this.getParent = function() {
        return parent;
    };

    this.toString = function() {
        return this["content"] || "";
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
            current_object = new Element(current_object, prefix, uri);
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
                callback(null, obj);
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
