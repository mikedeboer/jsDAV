/*
 * @package jsDAV
 * @subpackage shared
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
var jsDAV = require("./../jsdav");

var Exc = require("./exceptions");

var Crypto = require("crypto");
var Async = require("asyncjs");
var Util = require("util");
var Fs = require("fs");
// keep the following around until NodeJS < 0.8 blow over
if (!Fs.exists) {
    var Path = require("path");
    Fs.exists = Path.exists;
    Fs.existsSync = Path.existsSync;
}

/**
 * Make sure that an array instance contains only unique values (NO duplicates).
 *
 * @type {Array}
 */
exports.makeUnique = function(arr){
    var i, length, newArr = [];
    for (i = 0, length = arr.length; i < length; i++) {
        if (newArr.indexOf(arr[i]) == -1)
            newArr.push(arr[i]);
    }

    arr.length = 0;
    for (i = 0, length = newArr.length; i < length; i++)
        arr.push(newArr[i]);

    return arr;
};

/**
 * Search for a value 'obj' inside an array instance and remove it when found.
 *
 * @param {Array} arr
 * @param {mixed} obj
 * @type  {Array}
 */
exports.arrayRemove = function(arr, obj) {
    for (var i = arr.length - 1; i >= 0; i--) {
        if (arr[i] != obj)
            continue;
        arr.splice(i, 1);
    }
    return arr;
};

/**
 * Strips whitespace from the beginning and end of a string
 * version: 1107.2516
 * from: http://phpjs.org/functions/trim
 * original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
 *     example 1: trim('    Kevin van Zonneveld    ');
 *     returns 1: 'Kevin van Zonneveld'
 *     example 2: trim('Hello World', 'Hdle');
 *     returns 2: 'o Wor'
 *     example 3: trim(16, 1);
 *     returns 3: 6
 */
exports.trim = function(str, charlist) {
    // Strips whitespace from the beginning and end of a string
    var whitespace, l = 0, i = 0;
    str += "";

    if (!charlist) {
        // default list
        whitespace = " \n\r\t\f\x0b\xa0\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u200b\u2028\u2029\u3000";
    }
    else {
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

/**
 * Removes trailing whitespace
 * version: 1107.2516
 * from: http://phpjs.org/functions/rtrim
 * original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
 *     example 1: rtrim('    Kevin van Zonneveld    ');
 *     returns 1: '    Kevin van Zonneveld'
 */
exports.rtrim = function(str, charlist) {
    charlist = !charlist ? " \\s\u00A0" : (charlist+"").replace(/([\[\]\(\)\.\?\/\*\{\}\+\$\^\:])/g, "\\$1");
    var re = new RegExp("[" + charlist + "]+$", "g");
    return (str+"").replace(re, "");
};

/**
 * Checks if a needle occurs in a haystack ;)
 *
 * @param {String} haystack
 * @param {String} needle
 * @param {String} matchType
 * @return bool
 */
exports.textMatch = function(haystack, needle, matchType) {
    matchType = matchType ||  "contains";
    
    switch (matchType) {
        case "contains" :
            return haystack.indexOf(needle) > -1;
        case "equals" :
            return haystack === needle;
        case "starts-with" :
            return haystack.indexOf(needle) === 0;
        case "ends-with" :
            return haystack.lastIndexOf(needle) === (haystack.length - needle.length);
        default :
            throw new Exc.BadRequest("Match-type: " + matchType + " is not supported");
    }
};

/**
 * Splits a string into chunks like JS' String#split(), but with some additional
 * options, like each item in the resulting array is stripped from any whitespace.
 *
 * @param {String} s
 * @param {String} seperator
 * @param {Number} limit
 * @param {Boolean} bLowerCase
 */
exports.splitSafe = function(s, seperator, limit, bLowerCase) {
    return (bLowerCase && s.toLowerCase() || s)
        .replace(/(?:^\s+|\n|\s+$)/g, "")
        .split(new RegExp("[\\s ]*" + seperator + "[\\s ]*", "g"), limit || 999);
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

exports.arrayToMap = function(arr) {
    var map = {};
    for (var i = 0, l = arr.length; i < l; ++i)
        map[arr[i]] = 1;
    return map;
};

/**
 * Main used to check if 'err' is undefined or null
 *
 * @param  {mixed} obj
 * @return {Boolean}
 */
exports.empty = function(obj) {
    if (arguments.length === 1)
        return obj === undefined || obj === null || obj === "" || obj === false;
    // support multiple arguments that shortens:
    // Util.empty('foo') && Util.empty('bar') to Util.empty('foo', 'bar')
    for (var empty = true, i = 0, l = arguments.length; i < l && empty; ++i) {
        obj   = arguments[i];
        empty = (obj === undefined || obj === null || obj === "" || obj === false);
    }
    return empty;
};

/**
 * Determines whether a {String} is true in the html attribute sense.
 * @param {mixed} value the variable to check
 *   Possible values:
 *   true   The function returns true.
 *   'true' The function returns true.
 *   'on'   The function returns true.
 *   1      The function returns true.
 *   '1'    The function returns true.
 * @return {Boolean} whether the {String} is considered to imply truth.
 */
exports.isTrue = function(c){
    return (c === true || c === "true" || c === "on" || typeof c == "number" && c > 0 || c === "1");
};

/**
 * Determines whether a {String} is false in the html attribute sense.
 * @param {mixed} value the variable to check
 *   Possible values:
 *   false   The function returns true.
 *   'false' The function returns true.
 *   'off'   The function returns true.
 *   0       The function returns true.
 *   '0'     The function returns true.
 * @return {Boolean} whether the {String} is considered to imply untruth.
 */
exports.isFalse = function(c){
    return (c === false || c === "false" || c === "off" || c === 0 || c === "0");
};

exports.isScalar = function(mixed) {
    return (/boolean|number|string/).test(typeof mixed);
};

/**
 * Returns the 'dirname' and 'basename' for a path.
 *
 * The reason there is a custom function for this purpose, is because
 * basename() is locale aware (behaviour changes if C locale or a UTF-8 locale is used)
 * and we need a method that just operates on UTF-8 characters.
 *
 * In addition Path.split is platform aware, and will treat backslash (\) as a
 * directory separator on windows.
 *
 * This method returns the 2 components as an array.
 *
 * If there is no dirname, it will return an empty string. Any / appearing at the
 * end of the {String} is stripped off.
 *
 * @param {string} path
 * @return array
 */
exports.splitPath = function(path) {
    //var sPath = Url.parse(path).pathname;
    //return [Path.dirname(sPath) || null, Path.basename(sPath) || null];
    var matches = path.match(/^(?:(?:(.*)(?:\/+))?([^\/]+))(?:\/?)$/i);
    return matches && matches.length ? [matches[1] || "", matches[2] || ""] : [null, null];
};

exports.escapeRegExp = function(str) {
    return str.replace(/([.*+?\^${}()|\[\]\/\\])/g, "\\$1");
};

// taken from http://xregexp.com/
exports.grepEscapeRegExp = function(str) {
    return str.replace(/[[\]{}()*+?.,\\^$|#\s"']/g, "\\$&");
}

exports.escapeShell = function(str) {
    return str.replace(/([\\"'`$\s\(\)<>])/g, "\\$1");
};

// Internationalization strings
exports.i18n = {
    /**
     * Defines what day starts the week
     *
     * Monday (1) is the international standard.
     * Redefine this to 0 if you want weeks to begin on Sunday.
     */
    beginWeekday : 1,
    dayNames : [
        "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
        "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday",
        "Friday", "Saturday"
    ],

    dayNumbers : {
        "Sun" : 0, "Mon" : 1, "Tue" : 2, "Wed" : 3, "Thu" : 4, "Fri" : 5,
        "Sat" : 6, "Sunday" : 0, "Monday" : 1, "Tuesday" : 2,
        "Wednesday" : 3, "Thursday" : 4, "Friday" : 5, "Saturday" : 6
    },
    monthNames : [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ],
    monthNumbers : {
        "Jan" : 0, "Feb" : 1, "Mar" : 2, "Apr" : 3, "May" : 4, "Jun" : 5,
        "Jul" : 6, "Aug" : 7, "Sep" : 8, "Oct" : 9, "Nov" : 10, "Dec" : 11
    }
};

exports.DATE_DEFAULT        = "ddd mmm dd yyyy HH:MM:ss";
exports.DATE_SHORT          = "m/d/yy";
exports.DATE_MEDIUM         = "mmm d, yyyy";
exports.DATE_LONG           = "mmmm d, yyyy";
exports.DATE_FULL           = "dddd, mmmm d, yyyy";
exports.DATE_SHORTTIME      = "h:MM TT";
exports.DATE_MEDIUMTIME     = "h:MM:ss TT";
exports.DATE_LONGTIME       = "h:MM:ss TT Z";
exports.DATE_ISODATE        = "yyyy-mm-dd";
exports.DATE_ISOTIME        = "HH:MM:ss";
exports.DATE_ISODATETIME    = "yyyy-mm-dd'T'HH:MM:ss";
exports.DATE_ISOUTCDATETIME = "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'";
exports.DATE_RFC1123        = "ddd, dd mmm yyyy HH:MM:ss o";
exports.DATE_RFC822         = "ddd, dd, mmm yy HH:MM:ss Z";////RFC 822: 'Tue, 20 Jun 82 08:09:07 GMT'

exports.dateFormat = (function () {
    var	token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
        timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[\-+]\d{4})?)\b/g,
        timezoneClip = /[^\-+\dA-Z]/g,
        pad = function (val, len) {
            val = String(val);
            len = len || 2;
            while (val.length < len) val = "0" + val;
            return val;
        };

    // Regexes and supporting functions are cached through closure
    return function (date, mask, utc) {
        // You can't provide utc if you skip other args (use the "UTC:" mask prefix)
        if (arguments.length == 1 && (typeof date == "string"
          || date instanceof String) && !/\d/.test(date)) {
            mask = date;
            date = undefined;
        }

        // Passing date through Date applies apf.date.getDateTime, if necessary
        date = date ? new Date(date) : new Date();

        if (isNaN(date)) return "NaN";//throw new SyntaxError("invalid date");

        mask = String(mask || exports.DATE_DEFAULT);

        // Allow setting the utc argument via the mask
        if (mask.slice(0, 4) == "UTC:") {
            mask = mask.slice(4);
            utc = true;
        }

        var _ = utc ? "getUTC" : "get",
            d = date[_ + "Date"](),
            D = date[_ + "Day"](),
            m = date[_ + "Month"](),
            y = date[_ + "FullYear"](),
            H = date[_ + "Hours"](),
            M = date[_ + "Minutes"](),
            s = date[_ + "Seconds"](),
            L = date[_ + "Milliseconds"](),
            o = utc ? 0 : date.getTimezoneOffset(),
            flags = {
                d   : d,
                dd  : pad(d),
                ddd : exports.i18n.dayNames[D],
                dddd: exports.i18n.dayNames[D + 7],
                m   : m + 1,
                mm  : pad(m + 1),
                mmm : exports.i18n.monthNames[m],
                mmmm: exports.i18n.monthNames[m + 12],
                yy  : String(y).slice(2),
                yyyy: y,
                h   : H % 12 || 12,
                hh  : pad(H % 12 || 12),
                H   : H,
                HH  : pad(H),
                M   : M,
                MM  : pad(M),
                s   : s,
                ss  : pad(s),
                l   : pad(L, 3),
                L   : pad(L > 99 ? Math.round(L / 10) : L),
                t   : H < 12 ? "a"  : "p",
                tt  : H < 12 ? "am" : "pm",
                T   : H < 12 ? "A"  : "P",
                TT  : H < 12 ? "AM" : "PM",
                Z   : utc
                          ? "UTC"
                          : (String(date).match(timezone)
                              || [""]).pop().replace(timezoneClip, ""),
                o   : (o > 0 ? "-" : "+")
                         + pad(Math.floor(Math.abs(o) / 60) * 100
                         + Math.abs(o) % 60, 4),
                S   : ["th", "st", "nd", "rd"]
                      [d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
            };

        return mask.replace(token, function ($0) {
            return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
        });
    };
})();

/**
 * Return a hash of the given {String} and optional encoding, defaulting to hex.
 *
 * @param {String} str
 * @param {String} algo. Defaults to 'md5'
 * @param {String} encoding. Defaults to 'hex'
 * @return {String}
 * @api public
 */
exports.createHash = function(str, algo, encoding) {
    return Crypto.createHash(algo || "md5").update(str).digest(encoding || "hex");
};

/**
 * Return a hash of the given {ReadableStream} and optional encoding, defaulting
 * to hex.
 *
 * @param {ReadableStream} stream
 * @param {String} algo. Defaults to 'md5'
 * @param {String} encoding. Defaults to 'hex'
 * @param {Function} callback
 * @return {String}
 * @api public
 */
exports.createHashStream = function(stream, algo, encoding, callback) {
    if (arguments.length == 2) {
        callback = algo;
        algo = "md5"
        encoding = "hex";
    }
    else if (arguments.length == 3) {
        callback = encoding;
        encoding = "hex";
    }

    var hash = Crypto.createHash(algo || "md5");
    var callbackCalled = false;
    stream.on("data", function(buf) {
        hash.update(buf);
    });
    stream.on("error", function(err) {
        if (callbackCalled)
            return;
        callbackCalled = true;
        cbfsgetetag(err);
    });
    stream.on("end", function() {
        if (callbackCalled)
            return;
        callbackCalled = true;
        callback(null, hash.digest(encoding || "hex"));
    });
};

/**
 * Default mime type.
 */
var defaultMime = exports.defaultMime = "application/octet-stream";

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
          ".aml"   : "application/aml",
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
          ".coffee": "text/x-script.coffeescript",
          ".com"   : "application/x-msdownload",
          ".conf"  : "text/plain",
          ".cpp"   : "text/x-c",
          ".crt"   : "application/x-x509-ca-cert",
          ".cs"    : "text/x-csharp",
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
          ".php"   : "application/x-httpd-php",
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
          ".textile" : "text/x-web-textile",
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
          ".xhtml" : "application/xhtml+xml",
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

/**
 * Generate a random uuid. Usage: Math.uuid(length, radix)
 *
 * EXAMPLES:
 *   // No arguments  - returns RFC4122, version 4 ID
 *   >>> Math.uuid()
 *   "92329D39-6F5C-4520-ABFC-AAB64544E172"
 *
 *   // One argument - returns ID of the specified length
 *   >>> Math.uuid(15)     // 15 character ID (default base=62)
 *   "VcydxgltxrVZSTV"
 *
 *   // Two arguments - returns ID of the specified length, and radix. (Radix must be <= 62)
 *   >>> Math.uuid(8, 2)  // 8 character ID (base=2)
 *   "01001010"
 *   >>> Math.uuid(8, 10) // 8 character ID (base=10)
 *   "47473046"
 *   >>> Math.uuid(8, 16) // 8 character ID (base=16)
 *   "098F4D35"
 *
 * @param {Number} [len]   The desired number of characters. Defaults to rfc4122, version 4 form
 * @param {Number} [radix] The number of allowable values for each character.
 * @type  {String}
 */
exports.uuid = function(len, radix) {
    var i,
        chars = exports.uuid.CHARS,
        uuid  = [],
        rnd   = Math.random;
    radix     = radix || chars.length;

    if (len) {
        // Compact form
        for (i = 0; i < len; i++)
            uuid[i] = chars[0 | rnd() * radix];
    }
    else {
        // rfc4122, version 4 form
        var r;
        // rfc4122 requires these characters
        uuid[8] = uuid[13] = uuid[18] = uuid[23] = "-";
        uuid[14] = "4";

        // Fill in random data.  At i==19 set the high bits of clock sequence as
        // per rfc4122, sec. 4.1.5
        for (i = 0; i < 36; i++) {
            if (!uuid[i]) {
                r = 0 | rnd() * 16;
                uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r & 0xf];
            }
        }
    }

    return uuid.join("");
};
//Public array of chars to use
exports.uuid.CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".split("");

exports.uniqid = function(prefix, more_entropy) {
    // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +    revised by: Kankrelune (http://www.webfaktory.info/)
    // %        note 1: Uses an internal counter (in php_js global) to avoid collision
    // *     example 1: uniqid();
    // *     returns 1: 'a30285b160c14'
    // *     example 2: uniqid('foo');
    // *     returns 2: 'fooa30285b1cd361'
    // *     example 3: uniqid('bar', true);
    // *     returns 3: 'bara20285b23dfd1.31879087'
    if (typeof prefix == 'undefined') {
        prefix = "";
    }

    var retId;
    var formatSeed = function (seed, reqWidth) {
        seed = parseInt(seed, 10).toString(16); // to hex str
        if (reqWidth < seed.length) { // so long we split
            return seed.slice(seed.length - reqWidth);
        }
        if (reqWidth > seed.length) { // so short we pad
            return Array(1 + (reqWidth - seed.length)).join("0") + seed;
        }
        return seed;
    };

    if (!exports.uniqidSeed) { // init seed with big random int
        exports.uniqidSeed = Math.floor(Math.random() * 0x75bcd15);
    }
    exports.uniqidSeed++;

    retId = prefix // start with prefix, add current milliseconds hex string
          + formatSeed(parseInt(new Date().getTime() / 1000, 10), 8)
          + formatSeed(exports.uniqidSeed, 5); // add seed hex string
    if (more_entropy) {
        // for more entropy we add a float lower to 10
        retId += (Math.random() * 10).toFixed(8).toString();
    }

    return retId;
};

exports.concatBuffers = function(bufs) {
    var buffer,
        length = 0,
        index  = 0;

    if (!Array.isArray(bufs))
        bufs = Array.prototype.slice.call(arguments);

    for (var i = 0, l = bufs.length; i < l; ++i) {
        buffer = bufs[i];
        if (!buffer)
            continue;

        if (!Buffer.isBuffer(buffer))
            buffer = bufs[i] = new Buffer(buffer);
        length += buffer.length;
    }
    buffer = new Buffer(length);

    bufs.forEach(function(buf, i) {
        buf = bufs[i];
        buf.copy(buffer, index, 0, buf.length);
        index += buf.length;
        delete bufs[i];
    });

    return buffer;
};

/**
 * StreamBuffer - Buffers submitted data in advance to facilitate asynchonous operations
 * http://tech.richardrodger.com/2011/03/28/node-js---dealing-with-submitted-http-request-data-when-you-have-to-make-a-database-call-first/
 */
exports.streamBuffer = function(req) {
    // streambuffer already attached to req object
    if (req.streambuffer)
        return req;

    var buffers = [];
    var ended   = false;
    var ondata  = null;
    var onend   = null;

    req.streambuffer = {
        ondata: function(fn) {
            for (var i = 0; i < buffers.length; i++)
                fn(buffers[i]);
            ondata = fn;
            buffers = null;
        },

        onend: function(fn) {
            onend = fn;
            if (ended)
                onend();
        }
    };

    req.on("data", function(chunk) {
        if (!chunk)
            return;

        if (ondata)
            ondata(chunk);
        else
            buffers.push(chunk);
    });

    req.on("end", function() {
        ended = true;
        if (onend)
            onend();
    });

    return req;
};

exports.copy = function(src, dst, overwrite, callback) {
    function copy() {
        Fs.stat(src, function(err) {
            if (err)
                return callback(err);

            var readStream = Fs.createReadStream(src);
            var writeStream = Fs.createWriteStream(dst);
            writeStream.on("error", callback);
            writeStream.on("close", callback);
            readStream.pipe(writeStream, callback);
        });
    }

    if (overwrite) {
        copy();
    }
    else {
        Fs.stat(dst, function(err) {
            if (!err)
                return callback(new Error("File " + dst + " exists."));

            copy();
        });
    }
};

exports.move = function(src, dst, overwrite, callback) {
    function copyIfFailed(err) {
        if (!err)
            return callback(null);

        exports.copy(src, dst, overwrite, function(err) {
            if (!err) {
                // TODO
                // should we revert the copy if the unlink fails?
                Fs.unlink(src, callback);
            }
            else {
                callback(err);
            }
        });
    }

    if (overwrite) {
        Fs.rename(src, dst, copyIfFailed);
    }
    else {
        Fs.stat(dst, function(err) {
            if (!err)
                return callback(new Error("File " + dst + " exists."));

            Fs.rename(src, dst, copyIfFailed);
        });
    }
};

var levels = {
    "info":  ["\033[90m", "\033[39m"], // grey
    "error": ["\033[31m", "\033[39m"], // red
    "fatal": ["\033[35m", "\033[39m"], // magenta
    "exit":  ["\033[36m", "\033[39m"]  // cyan
};

var _slice = Array.prototype.slice;

exports.log = function() {
    var args = _slice.call(arguments);
    var lastArg = args[args.length - 1];

    var level = levels[lastArg] ? args.pop() : "info";
    if (!args.length)
        return;

    var msg = args.map(function(arg) {
        return typeof arg != "string" ? Util.inspect(arg) : arg;
    }).join(" ");
    var pfx = levels[level][0] + "[" + level + "]" + levels[level][1];

    msg.split("\n").forEach(function(line) {
        console.log(pfx + " " + line);
    });
};
