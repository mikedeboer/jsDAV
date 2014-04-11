/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var Exc = require("./exceptions");

/**
 * XML namespace for all jsDAV related elements
 */
exports.NS_AJAXORG = "http://ajax.org/2005/aml";

/**
 * This is a default list of namespaces.
 *
 * If you are defining your own custom namespace, add it here to reduce
 * bandwidth and improve legibility of xml bodies.
 *
 * @var array
 */
exports.xmlNamespaces = {
    "DAV:": "d",
    "http://ajax.org/2005/aml": "a"
};

/**
 * Returns the 'clark notation' for an element.
 *
 * For example, and element encoded as:
 * <b:myelem xmlns:b="http://www.example.org/" />
 * will be returned as:
 * {http://www.example.org}myelem
 *
 * This format is used throughout the jsDAV sourcecode.
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
    if (!dom)
        return null;
    if (!dom.nodeType)
        dom = {namespaceURI: dom, localName: arguments[1], nodeType: 1};
    if (dom.nodeType !== 1 || !dom.localName)
        return null;

    // Mapping back to the real namespace, in case it was dav
    var ns = dom.namespaceURI == "urn:DAV" ? "DAV:" : dom.namespaceURI;
    // Mapping to clark notation
    return "{" + ns + "}" + dom.localName.toLowerCase();
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

exports.xmlEntityMap = {
    "quot": "34", "amp": "38", "apos": "39", "lt": "60", "gt": "62",
    "nbsp": "160", "iexcl": "161", "cent": "162", "pound": "163", "curren": "164",
    "yen": "165", "brvbar": "166", "sect": "167", "uml": "168", "copy": "169",
    "ordf": "170", "laquo": "171", "not": "172", "shy": "173", "reg": "174",
    "macr": "175", "deg": "176", "plusmn": "177", "sup2": "178", "sup3": "179",
    "acute": "180", "micro": "181", "para": "182", "middot": "183", "cedil": "184",
    "sup1": "185", "ordm": "186", "raquo": "187", "frac14": "188", "frac12": "189",
    "frac34": "190", "iquest": "191", "agrave": ["192", "224"], "aacute": ["193", "225"],
    "acirc": ["194", "226"], "atilde": ["195", "227"], "auml": ["196", "228"],
    "aring": ["197", "229"], "aelig": ["198", "230"], "ccedil": ["199", "231"],
    "egrave": ["200", "232"], "eacute": ["201", "233"], "ecirc": ["202", "234"],
    "euml": ["203", "235"], "igrave": ["204", "236"], "iacute": ["205", "237"],
    "icirc": ["206", "238"], "iuml": ["207", "239"], "eth": ["208", "240"],
    "ntilde": ["209", "241"], "ograve": ["210", "242"], "oacute": ["211", "243"],
    "ocirc": ["212", "244"], "otilde": ["213", "245"], "ouml": ["214", "246"],
    "times": "215", "oslash": ["216", "248"], "ugrave": ["217", "249"],
    "uacute": ["218", "250"], "ucirc": ["219", "251"], "uuml": ["220", "252"],
    "yacute": ["221", "253"], "thorn": ["222", "254"], "szlig": "223", "divide": "247",
    "yuml": ["255", "376"], "oelig": ["338", "339"], "scaron": ["352", "353"],
    "fnof": "402", "circ": "710", "tilde": "732", "alpha": ["913", "945"],
    "beta": ["914", "946"], "gamma": ["915", "947"], "delta": ["916", "948"],
    "epsilon": ["917", "949"], "zeta": ["918", "950"], "eta": ["919", "951"],
    "theta": ["920", "952"], "iota": ["921", "953"], "kappa": ["922", "954"],
    "lambda": ["923", "955"], "mu": ["924", "956"], "nu": ["925", "957"],
    "xi": ["926", "958"], "omicron": ["927", "959"], "pi": ["928", "960"],
    "rho": ["929", "961"], "sigma": ["931", "963"], "tau": ["932", "964"],
    "upsilon": ["933", "965"], "phi": ["934", "966"], "chi": ["935", "967"],
    "psi": ["936", "968"], "omega": ["937", "969"], "sigmaf": "962", "thetasym": "977",
    "upsih": "978", "piv": "982", "ensp": "8194", "emsp": "8195", "thinsp": "8201",
    "zwnj": "8204", "zwj": "8205", "lrm": "8206", "rlm": "8207", "ndash": "8211",
    "mdash": "8212", "lsquo": "8216", "rsquo": "8217", "sbquo": "8218", "ldquo": "8220",
    "rdquo": "8221", "bdquo": "8222", "dagger": ["8224", "8225"], "bull": "8226",
    "hellip": "8230", "permil": "8240", "prime": ["8242", "8243"], "lsaquo": "8249",
    "rsaquo": "8250", "oline": "8254", "frasl": "8260", "euro": "8364",
    "image": "8465", "weierp": "8472", "real": "8476", "trade": "8482",
    "alefsym": "8501", "larr": ["8592", "8656"], "uarr": ["8593", "8657"],
    "rarr": ["8594", "8658"], "darr": ["8595", "8659"], "harr": ["8596", "8660"],
    "crarr": "8629", "forall": "8704", "part": "8706", "exist": "8707", "empty": "8709",
    "nabla": "8711", "isin": "8712", "notin": "8713", "ni": "8715", "prod": "8719",
    "sum": "8721", "minus": "8722", "lowast": "8727", "radic": "8730", "prop": "8733",
    "infin": "8734", "ang": "8736", "and": "8743", "or": "8744", "cap": "8745",
    "cup": "8746", "int": "8747", "there4": "8756", "sim": "8764", "cong": "8773",
    "asymp": "8776", "ne": "8800", "equiv": "8801", "le": "8804", "ge": "8805",
    "sub": "8834", "sup": "8835", "nsub": "8836", "sube": "8838", "supe": "8839",
    "oplus": "8853", "otimes": "8855", "perp": "8869", "sdot": "8901", "lceil": "8968",
    "rceil": "8969", "lfloor": "8970", "rfloor": "8971", "lang": "9001", "rang": "9002",
    "loz": "9674", "spades": "9824", "clubs": "9827", "hearts": "9829", "diams": "9830"
};

/**
 * Escape an xml string making it ascii compatible.
 * @param {String} str the xml {String} to escape.
 * @return {String} the escaped string.
 */
exports.escapeXml = function(str) {
    if (typeof str != "string")
        return str;
    return (str || "")
        .replace(/&/g, "&#38;")
        .replace(/"/g, "&#34;")
        .replace(/</g, "&#60;")
        .replace(/>/g, "&#62;")
        .replace(/'/g, "&#39;")
        .replace(/&([a-z]+);/gi, function(a, m) {
            var x = exports.xmlEntityMap[m.toLowerCase()];
            if (x)
                return "&#" + (Array.isArray(x) ? x[0] : x) + ";";
            return a;
        });
};

/**
 * This method provides a generic way to load a DOMDocument for WebDAV use.
 *
 * This method throws a Exc.BadRequest exception for any xml errors.
 * It does not preserve whitespace, and it converts the DAV: namespace to urn:DAV.
 *
 * @param {String} xml
 * @param {String} which 'libxml' or 'xmldom'. Default: 'xmldom'
 * @throws Exc.BadRequest
 * @return DOMDocument
 */
exports.loadDOMDocument = function(xml, which, callback) {
    if (!xml)
        return callback(new Exc.BadRequest("Empty XML document sent"));

    which = which || "xmldom";
    var root;
    var parser = which == "xmldom" ? require("xmldom").DOMParser : require("libxml/lib/libxml");
    xml = exports.convertDAVNamespace(xml);
    try {
        if (which = "xmldom") {
            function reportError(msg) {
                throw new Error(msg);
            }
            root = new parser({
                errorHandler: {
                    warning: reportError,
                    error: reportError,
                    fatalError: reportError
                }
            }).parseFromString(xml, "text/xml").documentElement;
        }
        else {
            root = exports.xmlParseError(parser.parseFromString(xml).documentElement);
        }
    }
    catch (ex) {
        return callback(new Exc.BadRequest("The request body had an invalid XML body. (message: " + 
        ex.message + ")"));
    }

    callback(null, root);
};

exports.xmlParseError = function(xml){
    //if (xml.documentElement.tagName == "parsererror") {
    if (xml.getElementsByTagName("parsererror").length) {
        exports.log("ATTENTION::: we actually HAVE an XML error :) ", "warn");
        var str     = xml.documentElement.firstChild.nodeValue.split("\n"),
            linenr  = str[2].match(/\w+ (\d+)/)[1],
            message = str[0].replace(/\w+ \w+ \w+: (.*)/, "$1"),

            srcText = xml.documentElement.lastChild.firstChild.nodeValue;//.split("\n")[0];
        throw new Error("XML Parse Error on line " +  linenr, message +
            "\nSource Text : " + srcText.replace(/\t/gi, " "));
    }

    return xml;
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
exports.parseProperties = function(parentNode, propertyMap) {
    propertyMap = propertyMap || [];
    var propNode, propNodeData, propertyName, j, k, c;
    var propList   = {};
    var childNodes = parentNode.childNodes;
    var i          = 0;
    var l          = childNodes.length;

    for (; i < l; ++i) {
        propNode = childNodes[i];

        if (exports.toClarkNotation(propNode) !== "{DAV:}prop")
            continue;

        for (j = 0, c = propNode.childNodes, k = c.length; j < k; ++j) {
            propNodeData = c[j];

            // If there are no elements in here, we actually get 1 text node,
            // this special case is dedicated to netdrive
            if (propNodeData.nodeType != 1) continue;

            propertyName = exports.toClarkNotation(propNodeData);
            if (propertyMap[propertyName]) {
                propList[propertyName] = propertyMap[propertyName].unserialize(propNodeData);
            }
            else {
                propList[propertyName] = propNodeData.firstChild
                    ? propNodeData.firstChild.nodeValue
                    : propNodeData.nodeValue;
            }
        }
    }
    return propList;
};
