/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

/**
 * Main Exception class.
 *
 * This class defines a getHTTPCode method, which should return the appropriate
 * HTTP code for the Exception occured.
 * The default for this is 500.
 *
 * This class also allows you to generate custom xml data for your exceptions.
 * This will be displayed in the 'error' element in the failing response.
 */
exports.jsDAV_Exception = function(msg, extra) {
    /**
     * The HTTP statuscode for this exception
     *
     * @return int
     */
    this.code    = 500;

    /**
     * The type of this exception, usually the same as the class name.
     */
    this.type    = "jsDAV_Exception";

    /**
     * The corresponding message for this exception
     *
     * @return int
     */
    this.message = msg || this.type;

    /**
     * This method allows the exception to return any extra HTTP response headers.
     *
     * The headers must be returned as an array.
     *
     * @return array
     */
    this.getHTTPHeaders = function(handler, cbheaders) { cbheaders(null, {}); };

    /**
     * This method allows the exception to include additonal information into the
     * WebDAV error response
     *
     * @param {jsDAV_Handler} handler
     * @param {DOMElement}    errorNode
     * @return void
     */
    this.serialize = function(handler, errorNode) {return errorNode;};

    this.toString = function(handler, cbtostring) {
        var self   = this;
        var headers = "";
        if (handler) {
            headers = "Headers: ";
            this.getHTTPHeaders(handler, function(err, h) {
                for (var i in h)
                    headers += "\t" + i + ": " + h[i] + "\n";
                afterHeaders();
            });
        }
        else {
            afterHeaders();
        }

        function afterHeaders() {
            var msg = headers + "HTTP code: " + self.code + "\n"
                + "Exception type: " + self.type + "\n"
                + "Message: " + self.message;
            return cbtostring ? cbtostring(null, msg) : msg;
        }
    };
};
require('util').inherits(exports.jsDAV_Exception, Error);


/**
 * BadRequest
 *
 * The BadRequest is thrown when the user submitted an invalid HTTP request
 * BadRequest
 */
exports.jsDAV_Exception_BadRequest = function(msg, extra) {
    this.code    = 400;
    this.type    = "jsDAV_Exception_BadRequest";
    this.message = msg || this.type;
};
exports.jsDAV_Exception_BadRequest.prototype = new exports.jsDAV_Exception();

/**
 * Conflict
 *
 * A 409 Conflict is thrown when a user tried to make a directory over an existing
 * file or in a parent directory that doesn't exist.
 */
exports.jsDAV_Exception_Conflict = function(msg, extra) {
    this.code    = 409;
    this.type    = "jsDAV_Exception_Conflict";
    this.message = msg || this.type;
};
exports.jsDAV_Exception_Conflict.prototype = new exports.jsDAV_Exception();

/**
 * Locked
 *
 * The 423 is thrown when a client tried to access a resource that was locked,
 * without supplying a valid lock token
 */
exports.jsDAV_Exception_Locked = function(lock) {
    this.code = 423;
    this.type = this.message = "jsDAV_Exception_Locked";
    this.lock = lock;

    this.serialize = function(handler, errorNode) {
        if (this.lock) {
            return errorNode + "<d:lock-token-submitted><d:href>" + this.lock.uri
                + "</d:href></d:lock-token-submitted>";
        }
        return errorNode;
    };
};
exports.jsDAV_Exception_Locked.prototype = new exports.jsDAV_Exception();

/**
 * ConflictingLock
 *
 * Similar to Exception_Locked, this exception thrown when a LOCK request
 * was made, on a resource which was already locked
 */
exports.jsDAV_Exception_ConflictingLock = function(lock) {
    this.type = this.message = "jsDAV_Exception_ConflictingLock";
    this.lock = lock;

    this.serialize = function(handler, errorNode) {
        if (this.lock) {
            return errorNode + "<d:no-conflicting-lock><d:href>" + this.lock.uri
                + "</d:href></d:no-conflicting-lock>";
        }
        return errorNode;
    };
};
exports.jsDAV_Exception_ConflictingLock.prototype = new exports.jsDAV_Exception_Locked();

/**
 * FileNotFound
 *
 * This Exception is thrown when a Node couldn't be found. It returns HTTP error
 * code 404
 */
exports.jsDAV_Exception_FileNotFound = function(msg, extra) {
    this.code    = 404;
    this.type    = "jsDAV_Exception_FileNotFound";
    this.message = msg || this.type;
};
exports.jsDAV_Exception_FileNotFound.prototype = new exports.jsDAV_Exception();

/**
 * Forbidden
 *
 * This exception is thrown whenever a user tries to do an operation he's not
 * allowed to
 */
exports.jsDAV_Exception_Forbidden = function(msg, extra) {
    this.code    = 403;
    this.type    = "jsDAV_Exception_Forbidden";
    this.message = msg || this.type;
};
exports.jsDAV_Exception_Forbidden.prototype = new exports.jsDAV_Exception();

/**
 * InsufficientStorage
 *
 * This Exception can be thrown, when for example a harddisk is full or a quota
 * is exceeded
 */
exports.jsDAV_Exception_InsufficientStorage = function(msg, extra) {
    this.code    = 507;
    this.type    = "jsDAV_Exception_InsufficientStorage";
    this.message = msg || this.type;
};
exports.jsDAV_Exception_InsufficientStorage.prototype = new exports.jsDAV_Exception();

/**
 * InvalidResourceType
 *
 * This exception is thrown when the user tried to create a new collection, with
 * a special resourcetype value that was not recognized by the server.
 *
 * See RFC5689 section 3.3
 */
exports.jsDAV_Exception_InvalidResourceType = function(msg, extra) {
    this.type    = "jsDAV_Exception_InvalidResourceType";
    this.message = msg || this.type;

    this.serialize = function(handler, errorNode) {
        return errorNode + "<d:valid-resourcetype />";
    };
};
exports.jsDAV_Exception_InvalidResourceType.prototype = new exports.jsDAV_Exception_Forbidden();

/**
 * LockTokenMatchesRequestUri
 *
 * This exception is thrown by UNLOCK if a supplied lock-token is invalid
 */
exports.jsDAV_Exception_LockTokenMatchesRequestUri = function() {
    this.type    = "jsDAV_Exception_LockTokenMatchesRequestUri";
    this.message = "The locktoken supplied does not match any locks on this entity";

    this.serialize = function(handler, errorNode) {
        return errorNode + "<d:lock-token-matches-request-uri />";
    };
};
exports.jsDAV_Exception_LockTokenMatchesRequestUri.prototype = new exports.jsDAV_Exception_Conflict();

/**
 * MethodNotAllowed
 *
 * The 405 is thrown when a client tried to create a directory on an already existing directory
 */
exports.jsDAV_Exception_MethodNotAllowed = function(msg, extra) {
    this.code    = 405;
    this.type    = "jsDAV_Exception_MethodNotAllowed";
    this.message = msg || this.type;

    this.getHTTPHeaders = function(handler, cbmethods) {
        handler.getAllowedMethods(handler.getRequestUri(), function(err, methods) {
            cbmethods(err, {
                "Allow" : methods.join(", ").toUpperCase()
            });
        });
    };
};
exports.jsDAV_Exception_MethodNotAllowed.prototype = new exports.jsDAV_Exception();

/**
 * NotAuthenticated
 *
 * This exception is thrown when the client did not provide valid
 * authentication credentials.
 */
exports.jsDAV_Exception_NotAuthenticated = function(msg, extra) {
    this.code    = 401;
    this.type    = "jsDAV_Exception_NotAuthenticated";
    this.message = msg || this.type;
};
exports.jsDAV_Exception_NotAuthenticated.prototype = new exports.jsDAV_Exception();

/**
 * NotImplemented
 *
 * This exception is thrown when the client tried to call an unsupported HTTP
 * method or other feature
 */
exports.jsDAV_Exception_NotImplemented = function(msg, extra) {
    this.code    = 501;
    this.type    = "jsDAV_Exception_NotImplemented";
    this.message = msg || this.type;
};
exports.jsDAV_Exception_NotImplemented.prototype = new exports.jsDAV_Exception();

/**
 * PreconditionFailed
 *
 * This exception is normally thrown when a client submitted a conditional request,
 * like for example an If, If-None-Match or If-Match header, which caused the HTTP
 * request to not execute (the condition of the header failed)
 */
exports.jsDAV_Exception_PreconditionFailed = function(msg, extra) {
    this.code    = 412;
    this.type    = "jsDAV_Exception_PreconditionFailed";
    this.message = msg || this.type;
    this.header  = extra;

    this.serialize = function(handler, errorNode) {
        return this.header
            ? errorNode + "<a:header>" + this.header + "</a:header>"
            : errorNode;
    };
};
exports.jsDAV_Exception_PreconditionFailed.prototype = new exports.jsDAV_Exception();

/**
 * ReportNotImplemented
 *
 * This exception is thrown when the client requested an unknown report through
 * the REPORT method
 */
exports.jsDAV_Exception_ReportNotImplemented = function(msg, extra) {
    this.type    = "jsDAV_Exception_ReportNotImplemented";
    this.message = msg || this.type;

    this.serialize = function(handler, errorNode) {
        return errorNode + "<d:supported-report/>";
    };
};
exports.jsDAV_Exception_ReportNotImplemented.prototype = new exports.jsDAV_Exception_NotImplemented();

/**
 * RequestedRangeNotSatisfiable
 *
 * This exception is normally thrown when the user
 * request a range that is out of the entity bounds.
 */
exports.jsDAV_Exception_RequestedRangeNotSatisfiable = function(msg, extra) {
    this.code    = 416;
    this.type    = "jsDAV_Exception_RequestedRangeNotSatisfiable";
    this.message = msg || this.type;
};
exports.jsDAV_Exception_RequestedRangeNotSatisfiable.prototype = new exports.jsDAV_Exception();

/**
 * UnSupportedMediaType
 *
 * The 415 Unsupported Media Type status code is generally sent back when the client
 * tried to call an HTTP method, with a body the server didn't understand
 */
exports.jsDAV_Exception_UnsupportedMediaType = function(msg, extra) {
    this.code    = 415;
    this.type    = "jsDAV_Exception_UnsupportedMediaType";
    this.message = msg || this.type;
};
exports.jsDAV_Exception_UnsupportedMediaType.prototype = new exports.jsDAV_Exception();
