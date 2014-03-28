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
require("util").inherits(exports.jsDAV_Exception, Error);

exports.notImplementedYet = function() {
    return new exports.NotImplemented("This feature has not been implemented yet!");
};

/**
 * BadRequest
 *
 * The BadRequest is thrown when the user submitted an invalid HTTP request
 * BadRequest
 */
exports.BadRequest = function(msg, extra) {
    this.code    = 400;
    this.type    = "BadRequest";
    this.message = msg || this.type;
};
exports.BadRequest.prototype = new exports.jsDAV_Exception();

/**
 * Conflict
 *
 * A 409 Conflict is thrown when a user tried to make a directory over an existing
 * file or in a parent directory that doesn't exist.
 */
exports.Conflict = function(msg, extra) {
    this.code    = 409;
    this.type    = "Conflict";
    this.message = msg || this.type;
};
exports.Conflict.prototype = new exports.jsDAV_Exception();

/**
 * This exception is thrown when a client attempts to set conflicting
 * permissions.
 */
exports.AceConflict = function(msg, extra) {
    this.msg = msg || this.msg;

    /**
     * Adds in extra information in the xml response.
     *
     * This method adds the {DAV:}no-ace-conflict element as defined in rfc3744
     *
     * @param jsDAV_Handler handler
     * @param {String} errorNode
     * @return void
     */
    this.serialize = function(handler, errorNode) {
        return errorNode + "<d:no-ace-conflict/>";
    };
};
exports.AceConflict.prototype = new exports.Conflict();

/**
 * Locked
 *
 * The 423 is thrown when a client tried to access a resource that was locked,
 * without supplying a valid lock token
 */
exports.Locked = function(lock) {
    this.code = 423;
    this.type = this.message = "Locked";
    this.lock = lock;

    this.serialize = function(handler, errorNode) {
        if (this.lock) {
            return errorNode + "<d:lock-token-submitted><d:href>" + this.lock.uri
                + "</d:href></d:lock-token-submitted>";
        }
        return errorNode;
    };
};
exports.Locked.prototype = new exports.jsDAV_Exception();

/**
 * ConflictingLock
 *
 * Similar to Exception_Locked, this exception thrown when a LOCK request
 * was made, on a resource which was already locked
 */
exports.ConflictingLock = function(lock) {
    this.type = this.message = "ConflictingLock";
    this.lock = lock;

    this.serialize = function(handler, errorNode) {
        if (this.lock) {
            return errorNode + "<d:no-conflicting-lock><d:href>" + this.lock.uri
                + "</d:href></d:no-conflicting-lock>";
        }
        return errorNode;
    };
};
exports.ConflictingLock.prototype = new exports.Locked();

/**
 * FileNotFound
 *
 * This Exception is thrown when a Node couldn't be found. It returns HTTP error
 * code 404
 */
exports.NotFound =
exports.FileNotFound = function(msg, extra) {
    this.code    = 404;
    this.type    = "FileNotFound";
    this.message = msg || this.type;
};
exports.FileNotFound.prototype = new exports.jsDAV_Exception();

/**
 * Forbidden
 *
 * This exception is thrown whenever a user tries to do an operation he's not
 * allowed to
 */
exports.Forbidden = function(msg, extra) {
    this.code    = 403;
    this.type    = "Forbidden";
    this.message = msg || this.type;
};
exports.Forbidden.prototype = new exports.jsDAV_Exception();

/**
 * NeedPrivileges
 *
 * The 403-need privileges is thrown when a user didn't have the appropriate
 * permissions to perform an operation
 */
exports.NeedPrivileges = function(uri, privileges) {
    /**
     * The relevant uri
     *
     * @var string
     */
    this.uri = uri

    /**
     * The privileges the user didn't have.
     *
     * @var array
     */
    this.privileges = privileges;

    this.msg = "User did not have the required privileges (" + privileges.join("") + ") for path '" + uri + "'";

    /**
     * Adds in extra information in the xml response.
     *
     * This method adds the {DAV:}need-privileges element as defined in rfc3744
     *
     * @param jsDAV_Handler handler
     * @param {String} errorNode
     * @return void
     */
    this.serialize = function(handler, errorNode) {
        var out = ["<d:need-privileges>"];

        var privilege, privilegeParts;
        for (var i = 0, l = this.privileges.length; i < l; ++i) {
            privilege = this.privileges[i];
            privilegeParts = privilege.match(/^\{([^}]*)\}(.*)$/);
            out.push("<d:resource><d:href>", handler.server.getBaseUri() + this.uri, 
                "</d:href><d:privilege><d:" + privilegeParts[2] + "/></d:privilege></d:resource>");
        }
        
        return errorNode + out.join("") + "</d:need-privileges>";
    };
};
exports.NeedPrivileges.prototype = new exports.Forbidden();

/**
 * InsufficientStorage
 *
 * This Exception can be thrown, when for example a harddisk is full or a quota
 * is exceeded
 */
exports.InsufficientStorage = function(msg, extra) {
    this.code    = 507;
    this.type    = "InsufficientStorage";
    this.message = msg || this.type;
};
exports.InsufficientStorage.prototype = new exports.jsDAV_Exception();

/**
 * InvalidResourceType
 *
 * This exception is thrown when the user tried to create a new collection, with
 * a special resourcetype value that was not recognized by the server.
 *
 * See RFC5689 section 3.3
 */
exports.InvalidResourceType = function(msg, extra) {
    this.type    = "InvalidResourceType";
    this.message = msg || this.type;

    this.serialize = function(handler, errorNode) {
        return errorNode + "<d:valid-resourcetype />";
    };
};
exports.InvalidResourceType.prototype = new exports.Forbidden();

/**
 * LockTokenMatchesRequestUri
 *
 * This exception is thrown by UNLOCK if a supplied lock-token is invalid
 */
exports.LockTokenMatchesRequestUri = function() {
    this.type    = "LockTokenMatchesRequestUri";
    this.message = "The locktoken supplied does not match any locks on this entity";

    this.serialize = function(handler, errorNode) {
        return errorNode + "<d:lock-token-matches-request-uri />";
    };
};
exports.LockTokenMatchesRequestUri.prototype = new exports.Conflict();

/**
 * MethodNotAllowed
 *
 * The 405 is thrown when a client tried to create a directory on an already existing directory
 */
exports.MethodNotAllowed = function(msg, extra) {
    this.code    = 405;
    this.type    = "MethodNotAllowed";
    this.message = msg || this.type;

    this.getHTTPHeaders = function(handler, cbmethods) {
        handler.getAllowedMethods(handler.getRequestUri(), function(err, methods) {
            cbmethods(err, {
                "Allow" : methods.join(", ").toUpperCase()
            });
        });
    };
};
exports.MethodNotAllowed.prototype = new exports.jsDAV_Exception();

/**
 * NotAuthenticated
 *
 * This exception is thrown when the client did not provide valid
 * authentication credentials.
 */
exports.NotAuthenticated = function(msg, extra) {
    this.code    = 401;
    this.type    = "NotAuthenticated";
    this.message = msg || this.type;
    this.headers = {};
    
    this.addHeader = function(name, value) {
        this.headers[name] = value;
    };
    
    this.getHTTPHeaders = function(handler, cbheaders) {
        cbheaders(null, this.headers);
    };
};
exports.NotAuthenticated.prototype = new exports.jsDAV_Exception();

/**
 * NotImplemented
 *
 * This exception is thrown when the client tried to call an unsupported HTTP
 * method or other feature
 */
exports.NotImplemented = function(msg, extra) {
    this.code    = 501;
    this.type    = "NotImplemented";
    this.message = msg || this.type;
};
exports.NotImplemented.prototype = new exports.jsDAV_Exception();

/**
 * Payment Required
 *
 * The PaymentRequired exception may be thrown in a case where a user must pay
 * to access a certain resource or operation.
 */
exports.PaymentRequired = function(msg, extra) {
    this.code    = 402;
    this.type    = "PaymentRequired";
    this.message = msg || this.type;
};
exports.PaymentRequired.prototype = new exports.jsDAV_Exception();

/**
 * PreconditionFailed
 *
 * This exception is normally thrown when a client submitted a conditional request,
 * like for example an If, If-None-Match or If-Match header, which caused the HTTP
 * request to not execute (the condition of the header failed)
 */
exports.PreconditionFailed = function(msg, extra) {
    this.code    = 412;
    this.type    = "PreconditionFailed";
    this.message = msg || this.type;
    this.header  = extra;

    this.serialize = function(handler, errorNode) {
        return this.header
            ? errorNode + "<a:header>" + this.header + "</a:header>"
            : errorNode;
    };
};
exports.PreconditionFailed.prototype = new exports.jsDAV_Exception();

/**
 * This exception is thrown when a user tries to set a privilege that's marked
 * as abstract.
 */
exports.NoAbstract = function(msg, extra) {
    this.msg = msg || this.msg;

    /**
     * Adds in extra information in the xml response.
     *
     * This method adds the {DAV:}no-abstract element as defined in rfc3744
     *
     * @param jsDAV_Handler handler
     * @param {String} errorNode
     * @return void
     */
    this.serialize = function(server, errorNode) {
        return errorNode + "<d:no-abstract/>";
    };
};
exports.NoAbstract.prototype = new exports.PreconditionFailed();

/**
 * If a client tried to set a privilege assigned to a non-existant principal,
 * this exception will be thrown.
 */
exports.NotRecognizedPrincipal = function(msg, extra) {
    this.msg = msg || this.msg;
    
    /**
     * Adds in extra information in the xml response.
     *
     * This method adds the {DAV:}recognized-principal element as defined in rfc3744
     *
     * @param jsDAV_Handler handler
     * @param {String} errorNode
     * @return void
     */
    this.serialize = function(handler, errorNode) {
        return errorNode + "<d:recognized-principal/>";
    };
};
exports.NotRecognizedPrincipal.prototype = new exports.PreconditionFailed();

/**
 * If a client tried to set a privilege that doesn't exist, this exception will
 * be thrown.
 */
exports.NotSupportedPrivilege = function(msg, extra) {
    this.msg = msg || this.msg;

    /**
     * Adds in extra information in the xml response.
     *
     * This method adds the {DAV:}not-supported-privilege element as defined in rfc3744
     *
     * @param jsDAV_Handler handler
     * @param {String} errorNode
     * @return void
     */
    this.serialize = function(handler, errorNode) {
        return errorNode + "<d:not-supported-privilege/>";
    };
};
exports.NotSupportedPrivilege.prototype = new exports.PreconditionFailed();

/**
 * ReportNotImplemented
 *
 * This exception is thrown when the client requested an unknown report through
 * the REPORT method
 */
exports.ReportNotImplemented = function(msg, extra) {
    this.type    = "ReportNotImplemented";
    this.message = msg || this.type;

    this.serialize = function(handler, errorNode) {
        return errorNode + "<d:supported-report/>";
    };
};
exports.ReportNotImplemented.prototype = new exports.NotImplemented();

/**
 * RequestedRangeNotSatisfiable
 *
 * This exception is normally thrown when the user
 * request a range that is out of the entity bounds.
 */
exports.RequestedRangeNotSatisfiable = function(msg, extra) {
    this.code    = 416;
    this.type    = "RequestedRangeNotSatisfiable";
    this.message = msg || this.type;
};
exports.RequestedRangeNotSatisfiable.prototype = new exports.jsDAV_Exception();

/**
 * ServiceUnavailable
 *
 * This exception is thrown in case the service
 * is currently not available (e.g. down for maintenance).
 */
exports.ServiceUnavailable = function(msg, extra) {
    this.code    = 503;
    this.type    = "ServiceUnavailable";
    this.message = msg || this.type;
};
exports.ServiceUnavailable.prototype = new exports.jsDAV_Exception();

/**
 * UnSupportedMediaType
 *
 * The 415 Unsupported Media Type status code is generally sent back when the client
 * tried to call an HTTP method, with a body the server didn't understand
 */
exports.UnsupportedMediaType = function(msg, extra) {
    this.code    = 415;
    this.type    = "UnsupportedMediaType";
    this.message = msg || this.type;
};
exports.UnsupportedMediaType.prototype = new exports.jsDAV_Exception();
