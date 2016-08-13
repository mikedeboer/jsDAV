/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_ServerPlugin = require("./../plugin");
var jsDAV_Property_SupportedLock = require("./../property/supportedLock");
var jsDAV_Property_LockDiscovery = require("./../property/lockDiscovery");
var jsDAV_iFile = require("./../interfaces/iFile");
var jsDAV_iLockable = require("./../interfaces/iLockable");
var jsDAV_Locks_LockInfo = require("./locks/lockinfo");

var Async = require("asyncjs");
var Exc = require("./../../shared/exceptions");
var Util = require("./../../shared/util");
var Xml = require("./../../shared/xml");

var jsDAV_Locks_Plugin = module.exports = jsDAV_ServerPlugin.extend({
    /**
     * Plugin name
     *
     * @var String
     */
    name: "locks",
    
    initialize: function(handler) {
        this.handler = handler;
        //this.locksBackend = locksBackend;
        this.locksBackend = handler.server.options.locksBackend || null;

        handler.addEventListener("unknownMethod", this.unknownMethod.bind(this));
        handler.addEventListener("beforeMethod", this.beforeMethod.bind(this));
        handler.addEventListener("afterGetProperties", this.afterGetProperties.bind(this));
        handler.addEventListener("afterDelete", this.afterDelete.bind(this));
        handler.addEventListener("afterMove", this.afterMove.bind(this));
    },

    /**
     * This method intercepts all MOVE methods to delete all remaining locks on the original resource.
     * See RFC4918 section 7.7 for more details.
     *
     * @param e
     * @param {String} destinationUri destination URI
     */
    afterMove: function(e, destinationUri) {
        var uri = this.handler.getRequestUri();
        this.removeLockFromRoot(uri, function(err) {
            e.next(err);
        });
    },

    /**
     * This method intercepts all DELETE methods to delete all remaining locks rooted on this resource.
     * See RFC4918 section 9.6 for more details.
     *
     * @param e
     * @param uri {String} deleted object
     * @return bool
     */
    afterDelete: function(e, uri) {
        this.removeLockFromRoot(uri, function(err) {
            e.next(err);
        });
    },

    /**
     * Deletes a lock with its root on the given uri from the lock backend (if there is one).
     *
     * @param uri URI of the locks root
     */
    removeLockFromRoot: function(uri, cbdeletelock) {
        if (!this.locksBackend)
            cbdeletelock();
        // Not sure if returnChildLocks should be true here
        var self = this;
        this.getLocks(uri, false, function(err, locks) {
            if (err) {
                cbdeletelock(err);
            } else if(locks) {
                var callbackCalled = false;
                Async.list(locks).each(function(lockInfo, next) {
                    if(lockInfo.uri == uri) {
                        if (self.locksBackend)
                            return self.locksBackend.unlock(uri, lockInfo, function(err){
                                callbackCalled = true;
                                cbdeletelock(err);
                            });
                        next(Async.STOP);
                    } else {
                        next();
                    }
                }).end(function(err) {
                    if(!callbackCalled) {
                        cbdeletelock(err);
                    }
                });
            } else {
                cbdeletelock();
            }
        });
    },

    /**
     * This method is called by the Server if the user used an HTTP method
     * the server didn"t recognize.
     *
     * This plugin intercepts the LOCK and UNLOCK methods.
     *
     * @param {String} method
     * @return bool
     */
    unknownMethod: function(e, method) {
        if (!this.locksBackend)
            return e.next();

        if (method == "LOCK")
            this.httpLock(e);
        else if (method == "UNLOCK")
            this.httpUnlock(e);
        else
            e.next();
    },

    /**
     * This method is called after most properties have been found
     * it allows us to add in any Lock-related properties
     *
     * @param {String} path
     * @param {Array} properties
     * @return bool
     */
    afterGetProperties: function(e, path, newProperties) {
        if (!this.locksBackend)
            return e.next();

        var self = this;
        Async.list(Object.keys(newProperties["404"])).each(function(propName, next) {
            var val = false;
            switch (propName) {
                case "{DAV:}supportedlock" :
                    if (self.locksBackend) {
                        val = true;
                        afterGetNode();
                    }
                    else {
                        self.handler.getNodeForPath(path, function(err, node) {
                            if (err)
                                return next((err instanceof Exc.FileNotFound) ? null : err);
                            if (node.hasFeature(jsDAV_iLockable))
                                val = true;
                            afterGetNode();
                        });
                    }
                    break;
                case "{DAV:}lockdiscovery" :
                    self.getLocks(path, false, function(err, locks) {
                        if (err)
                            return next(err);
                        newProperties["200"][propName] = jsDAV_Property_LockDiscovery.new(locks);
                        delete newProperties["404"][propName];
                        next();
                    });
                    break;
                default:
                    next();
                    break;
            }

            function afterGetNode() {
                newProperties["200"][propName] = jsDAV_Property_SupportedLock.new(val);
                delete newProperties["404"][propName];
                next();
            }
        })
        .end(function(err) {
            e.next(err);
        });
    },

    /**
     * This method is called before the logic for any HTTP method is
     * handled.
     *
     * This plugin uses that feature to intercept access to locked resources.
     *
     * @param {String} method
     * @return bool
     */
    beforeMethod: function(e, method) {
        if (!this.locksBackend)
            return e.next();

        var req = this.handler.httpRequest;
        switch (method) {
            case "DELETE" :
            case "MKCOL" :
            case "PROPPATCH" :
            case "PUT" :
                this.validateLock(null, false, function(err, isValid, lastLock) {
                    e.next(err ? err : !isValid ? new Exc.Locked(lastLock) : null);
                });
                break;
            case "MOVE" :
                this.validateLock([
                      this.handler.getRequestUri(),
                      this.handler.calculateUri(req.headers["destination"])
                  ], false, function(err, isValid, lastLock) {
                    e.next(err ? err : !isValid ? new Exc.Locked(lastLock) : null);
                });
                break;
            case "COPY" :
                this.validateLock(this.handler.calculateUri(req.headers["destination"]),
                  false,
                  function(err, isValid, lastLock) {
                      e.next(err ? err : !isValid ? new Exc.Locked(lastLock) : null);
                  });
                break;
            default:
                e.next();
                break;
        }
    },

    /**
     * Use this method to tell the server this plugin defines additional
     * HTTP methods.
     *
     * This method is passed a uri. It should only return HTTP methods that are
     * available for the specified uri.
     *
     * @param {String} uri
     * @return array
     */
    getHTTPMethods: function(uri, node) {
        if (this.locksBackend || (node && node.hasFeature(jsDAV_iLockable)))
            return ["LOCK", "UNLOCK"];
        return [];
    },

    /**
     * Returns a list of features for the HTTP OPTIONS Dav: header.
     *
     * In this case this is only the number 2. The 2 in the Dav: header
     * indicates the server supports locks.
     *
     * @return array
     */
    getFeatures: function() {
        return ["2"];
    },

    /**
     * Returns all lock information on a particular uri
     *
     * This function should return an array with jsDAV_Locks_LockInfo objects.
     * If there are no locks on a file, return an empty array.
     *
     * Additionally there is also the possibility of locks on parent nodes, so
     * we'll need to traverse every part of the tree.
     *
     * @param {String} uri
     * @return array
     */
    getLocks: function(uri, returnChildLocks, cbgetlocks) {
        var lockList    = [];
        var uriLocks    = [];
        var currentPath = "";
        var self        = this;

        Async.list(uri.split("/"))
            .delay(0, 10)
            .each(function(uriPart, next) {
                if (currentPath)
                    currentPath += "/";
                currentPath += uriPart;
                self.handler.getNodeForPath(currentPath, function(err, node) {
                    if (err)
                        return next((err instanceof Exc.FileNotFound) ? null : err);

                    if (node.hasFeature(jsDAV_iLockable)) {
                        node.getLocks(function(err, locks) {
                            if (err)
                                return next(err);
                            uriLocks = locks;
                            next();
                        });
                    }
                    else {
                        next();
                    }
                });
            })
            .end(function(err) {
                if (err)
                    return cbgetlocks(err);

                for (var i = 0, l = uriLocks.length; i < l; ++i) {// as uriLock) {
                    var uriLock = uriLocks[i];
                    // Unless we're on the leaf of the uri-tree we should ingore locks with depth 0
                    if (uri == currentPath || uriLock.depth !== 0) {
                        uriLock.uri = currentPath;
                        lockList.push(uriLock);
                    }
                }
                if (self.locksBackend) {
                    self.locksBackend.getLocks(uri, returnChildLocks, function(err, locks) {
                        cbgetlocks(err, lockList.concat(locks));
                    });
                }
                else
                    cbgetlocks(null, lockList);
            });
    },

    /**
     * Locks an uri
     *
     * The WebDAV lock request can be operated to either create a new lock on a
     * file, or to refresh an existing lock.
     * If a new lock is created, a full XML body should be supplied, containing
     * information about the lock such as the type of lock (shared or exclusive)
     * and the owner of the lock.
     *
     * If a lock is to be refreshed, no body should be supplied and there should
     * be a valid If header containing the lock.
     *
     * Additionally, a lock can be requested for a non-existant file. In this
     * case we're obligated to create an empty file as per RFC4918:S7.3
     *
     * @return void
     */
    httpLock: function(e) {
        var timeout;
        var uri  = this.handler.getRequestUri();
        var self = this;

        this.validateLock(uri, false, function(err, isValid, lastLock) {
            if (err)
                return e.next(err);

            if (!isValid) {
                // If the existing lock was an exclusive lock, we need to fail
                if (!lastLock || lastLock.scope == jsDAV_Locks_LockInfo.EXCLUSIVE)
                    return e.next(new Exc.ConflictingLock(lastLock));
            }

            self.handler.getRequestBody("utf8", null, false, function(err, body) {
                if (err)
                    return e.next(err);

                var lockInfo;
                if (body) {
                    // This is a new lock request
                    lockInfo       = self.parseLockRequest(body);
                    lockInfo.depth = self.handler.getHTTPDepth();
                    lockInfo.uri   = uri;
                    if (lastLock && lockInfo.scope != jsDAV_Locks_LockInfo.SHARED)
                        return e.next(new Exc.ConflictingLock(lastLock));
                }
                else if (lastLock) {
                    // This must have been a lock refresh
                    lockInfo = lastLock;
                    // The resource could have been locked through another uri.
                    if (uri != lockInfo.uri)
                        uri = lockInfo.uri;
                }
                else {
                    // There was neither a lock refresh nor a new lock request
                    return e.next(new Exc.BadRequest("An xml body is required for lock requests"));
                }

                try {
                    timeout = self.getTimeoutHeader();
                }
                catch (ex) {
                    return e.next(ex);
                }
                lockInfo.timeout = timeout;

                var newFile = false;

                // If we got this far.. we should go check if this node actually exists.
                // If this is not the case, we need to create it first
                self.handler.getNodeForPath(uri, function(err, node) {
                    if (err) {
                        if (err instanceof Exc.FileNotFound) {
                            // It didn't, lets create it
                            self.handler.createFile(uri, new Buffer(0), "utf8", function(err) {
                                if (err)
                                    return e.next(err);
                                newFile = true;
                                afterNode();
                            });
                        }
                        else
                            return e.next(err);
                    }
                    else
                        afterNode();

                    function afterNode() {
                        // We need to call the beforeWriteContent event for RFC3744
                        self.handler.dispatchEvent("beforeWriteContent", [uri, node]);

                        self.lockNode(uri, lockInfo, function(err) {
                            if (err)
                                return e.next(err);

                            self.handler.httpResponse.writeHead(newFile ? 201 : 200, {
                                "Content-Type": "application/xml; charset=utf-8",
                                "Lock-Token": "<opaquelocktoken:" + lockInfo.token + ">"
                            });
                            self.handler.httpResponse.end(self.generateLockResponse(lockInfo));
                            e.stop();
                        });
                    }
                });
            });
        });
    },

    /**
     * Unlocks a uri
     *
     * This WebDAV method allows you to remove a lock from a node. The client
     * should provide a valid locktoken through the Lock-token http header.
     * The server should return 204 (No content) on success
     *
     * @return void
     */
    httpUnlock: function(e) {
        var uri       = this.handler.getRequestUri();
        var lockToken = this.handler.httpRequest.headers["lock-token"];
        var self      = this;

        // If the locktoken header is not supplied, we need to throw a bad request exception
        if (!lockToken)
            return e.next(new Exc.BadRequest("No lock token was supplied"));

        this.getLocks(uri, false, function(err, locks) {
            if (err)
                return e.next(err);

            var lock, found;
            var i = 0;
            var l = locks.length;
            for (; i < l; ++i) {//locks as lock) {
                lock = locks[i];
                if ("<opaquelocktoken:" + lock.token + ">" == lockToken) {
                    found = lock;
                    break;
                }
            }

            if (found) {
                self.unlockNode(uri, lock, function(err) {
                    if (err)
                        return e.next(err);
                    self.handler.httpResponse.writeHead(204, {"Content-Length": "0"});
                    self.handler.httpResponse.end();
                    e.stop();
                });
            }
            else {
                // If we got here, it means the locktoken was invalid
                e.next(new Exc.LockTokenMatchesRequestUri());
            }
        });
    },

    /**
     * Locks a uri
     *
     * All the locking information is supplied in the lockInfo object. The object
     * has a suggested timeout, but this can be safely ignored.
     * It is important that if the existing timeout is ignored, the property is
     * overwritten, as this needs to be sent back to the client.
     *
     * @param {String} uri
     * @param jsDAV_Locks_LockInfo lockInfo
     * @return void
     */
    lockNode: function(uri, lockInfo, cblock) {
        var self = this;
        this.handler.dispatchEvent("beforeLock", [uri], function(stop, updatedLock) {
            if (stop === true)
                return cblock(null, lockInfo);

            // event handler might have updated the lock!
            if (updatedLock)
                lockInfo = updatedLock;

            self.handler.getNodeForPath(uri, function(err, node) {
                // In case the node didn't exist, this could be a lock-null request
                if (err && !(err instanceof Exc.FileNotFound))
                    return cblock(err);

                if (node && node.hasFeature(jsDAV_iLockable))
                    return node.lock(lockInfo, cblock);

                if (self.locksBackend)
                    return self.locksBackend.lock(uri, lockInfo, cblock);

                cblock(new Exc.MethodNotAllowed("Locking support is not "
                    + "enabled for this resource. No Locking backend was found so if you "
                    + "didn't expect this error, please check your configuration."));
            });
        });
    },

    /**
     * Unlocks a uri
     *
     * This method removes a lock from a uri. It is assumed all the supplied
     * information is correct and verified.
     *
     * @param {String} uri
     * @param jsDAV_Locks_LockInfo lockInfo
     * @return void
     */
    unlockNode: function(uri, lockInfo, cbunlock) {
        var self = this;
        this.handler.dispatchEvent("beforeUnlock", [uri], function(stop, updatedLock) {
            if (stop === true)
                return cbunlock(null, lockInfo);

            // event handler might have updated the lock!
            if (updatedLock)
                lockInfo = updatedLock;

            self.handler.getNodeForPath(uri, function(err, node) {
                // In case the node didn't exist, this could be a lock-null request
                if (err && !(err instanceof Exc.FileNotFound))
                    return cbunlock(err);

                if (node && node.hasFeature(jsDAV_iLockable))
                    return node.unlock(cbunlock, lockInfo);

                if (self.locksBackend)
                    return self.locksBackend.unlock(uri, lockInfo, cbunlock);

                cbunlock();
            });
        });
    },

    /**
     * Returns the contents of the HTTP Timeout header.
     *
     * The method formats the header into an integer.
     *
     * @return int
     */
    getTimeoutHeader: function() {
        var header = this.handler.httpRequest.headers["timeout"];
        if (header) {
            if (header.toLowerCase().indexOf("second-") === 0)
                header = parseInt(header.substr(7), 10);
            else if (header.toLowerCase() == "infinite")
                header = jsDAV_Locks_LockInfo.TIMEOUT_INFINITE;
            else
                throw new Exc.BadRequest("Invalid HTTP timeout header");
        }
        else {
            header = 0;
        }

        return header;
    },

    /**
     * Generates the response for successfull LOCK requests
     *
     * @param jsDAV_Locks_LockInfo lockInfo
     * @return string
     */
    generateLockResponse: function(lockInfo) {
        var lockObj = jsDAV_Property_LockDiscovery.new([lockInfo], true);

        var xml = '<?xml version="1.0" encoding="utf-8"?><d:prop';

        // Adding in default namespaces
        var prefix, namespace;
        for (namespace in Xml.xmlNamespaces) {
            prefix = Xml.xmlNamespaces[namespace];
            xml += ' xmlns:' + prefix + '="' + namespace + '"';
        }

        return xml + "><d:lockdiscovery>" +
            lockObj.serialize(this.handler, "") + "</d:lockdiscovery></d:prop>";
    },

    /**
     * validateLock should be called when a write operation is about to happen.
     * It will check if the requested url is locked, and see if the correct lock
     * tokens are passed.
     *
     * @param {mixed} urls     List of relevant urls. Can be an array, a string or
     *                       nothing at all for the current request uri
     * @param {mixed} lastLock This variable will be populated with the last checked
     *                       lock object (jsDAV_Locks_LockInfo)
     * @return bool
     */
    validateLock: function(urls, checkChildLocks, cbvalidate) {
        var lastLock = null;
        urls = urls || null;

        if (urls === null) {
            try {
                urls = [this.handler.getRequestUri()];
            }
            catch (ex) {
                return cbvalidate(ex);
            }
        }
        else if (typeof urls == "string") {
            urls = [urls];
        }
        else if (!Array.isArray(urls)) {
            return cbvalidate(new Exc.jsDAV_Exception("The urls parameter should either be null, a string or an array"), false, null);
        }

        var ret, locks;
        var stopped    = false;
        var cbCalled   = false;
        var conditions = this.getIfConditions();
        var self       = this;

        // We're going to loop through the urls and make sure all lock conditions
        // are satisfied
        Async.list(urls)
            .delay(0, 10)
            .each(function(url, next) {
                self.getLocks(url, false, function(err, aLocks) {
                    if (err)
                        return next(err);

                    locks = [].concat(aLocks);

                    // If there were no conditions, but there were locks, we fail
                    if (!conditions.length && locks.length) {
                        ret = false;
                        cbvalidate(null, ret, locks[0]);
                        cbCalled = true;
                        stopped = true;
                        return next(Async.STOP);
                    }

                    // If there were no locks or conditions, we go to the next url
                    if (!locks.length && !conditions.length)
                        return next();

                    Async.list(conditions)
                        .delay(0, 10)
                        .each(function(condition, next2) {
                            var conditionUri;
                            try {
                                conditionUri = condition.uri ? self.handler.calculateUri(condition.uri) : "";
                            }
                            catch (ex) {
                                return next2(ex);
                            }

                            // If the condition has a url, and it isn't part of the affected
                            // url at all, check the next condition
                            if (conditionUri && url.indexOf(conditionUri) !== 0)
                                return next2();

                            // The tokens array contains arrays with 2 elements. 0=true/false
                            // for normal/not condition, 1=locktoken
                            // At least 1 condition has to be satisfied
                            var tokensStopped = false;
                            Async.list(condition.tokens).each(function(conditionToken, next3) {
                                var etagValid = true;
                                var lockValid = true;

                                // condition can contain an etag
                                if ("etag" in conditionToken && conditionToken.etag !== null) {
                                    var uri;
                                    try {
                                        uri = conditionUri ? conditionUri : self.handler.getRequestUri();
                                    }
                                    catch (ex) {
                                        return next3(ex);
                                    }
                                    self.handler.getNodeForPath(uri, function(err, node) {
                                        if (err)
                                            return next3((err instanceof Exc.FileNotFound) ? null : err);

                                        if (!node.hasFeature(jsDAV_iFile))
                                            return afterEtag();

                                        node.getETag(function(err, etag) {
                                            if (err)
                                                return next3(err);
                                            etagValid = etag === null || etag == conditionToken.etag;
                                            afterEtag();
                                        });
                                    });
                                }
                                else
                                    afterEtag();

                                function afterEtag() {
                                    // condition can contain a lock token
                                    if ("token" in conditionToken && conditionToken.token !== null) {
                                        lockValid = false;
                                        // Match all the locks
                                        for (var lock, lockToken, lockIndex = 0, l = locks.length; lockIndex < l; ++lockIndex) {
                                            lock      = locks[lockIndex];
                                            lockToken = "opaquelocktoken:" + lock.token;
                                            // Checking NOT
                                            if (conditionToken.not && lockToken != conditionToken.token) {
                                                // Condition valid, onto the next
                                                lockValid = true;
                                                break;
                                            }
                                            if (!conditionToken.not && lockToken == conditionToken.token) {
                                                lastLock = lock;
                                                // Condition valid and lock matched
                                                locks.splice(lockIndex, 1);
                                                lockValid = true;
                                                break;
                                            }
                                        }
                                    }

                                    // If, after checking both etags and locks they are stil valid,
                                    // we can continue with the next condition.
                                    if (etagValid && lockValid) {
                                        tokensStopped = true;
                                        next3(Async.STOP);
                                    }
                                    else
                                        next3();
                                }
                            })
                            .end(function(err) {
                                if (err)
                                    return next2(err);
                                if (!tokensStopped) {
                                    // No conditions matched, so we fail
                                    return next2(new Exc.PreconditionFailed("The tokens "
                                       + "provided in the if header did not match", "If"));
                                }
                                stopped = true;
                                next2(Async.STOP);
                            });
                        })
                        .end(next);
                });
            })
            .end(function(err) {
                if (cbCalled) {
                    // we must not call callback twice
                    return
                }

                if (err && !stopped)
                    return cbvalidate(err, false, lastLock);

                // Conditions were met, we'll also need to check if all the locks are gone
                if (locks.length) {
                    // There's still locks, we fail
                    return cbvalidate(err, false, locks[0]);
                }
                // We got here, this means every condition was satisfied
                cbvalidate(null, true, lastLock);
            });
    },

    /**
     * This method is created to extract information from the WebDAV HTTP "If:"
     * header.
     *
     * The If header can be quite complex, and has a bunch of features. We're
     * using a regex to extract all relevant information.
     * The function will return an array, containg structs with the following keys
     *
     *   * uri    - the uri the condition applies to. This can be an empty string
     *              for "every relevant url"
     *   * tokens - The lock token. another 2 dimensional array containg 2 elements
     *              (0 = true/false.. If this is a negative condition its set to
     *              false, 1 = the actual token)
     *   * etag   - an etag, if supplied
     *
     * @return void
     */
    getIfConditions: function() {
        var header = this.handler.httpRequest.headers["if"];
        if (!header)
            return [];

        var conditions = [];
        header.replace(/(?:<(.*?)>\s)?\((Not\s)?(?:<([^>]*)>)?(?:\s?)(?:\[([^\]]*)\])?\)/gi,
          function(m, uri, not, token, etag) {
              var token = {
                  not: !!not,
                  token: token,
                  etag: etag ? etag : null
              };
              var condition = {
                  uri    : uri,
                  tokens : [token]
              };

              if (!condition.uri && conditions.length)
                  conditions[conditions.length - 1].tokens.push(token);
              else
                  conditions.push(condition);
          });

        return conditions;
    },

    /**
     * Parses a webdav lock xml body, and returns a new jsDAV_Locks_LockInfo object
     *
     * @param {String} body
     * @return jsDAV_Locks_LockInfo
     */
    parseLockRequest: function(xml) {
        var lockInfo = jsDAV_Locks_LockInfo.new();

        var m = xml.match(/<(?:d\:)?owner>([\w\W\n\r\t\s]*)<\/(?:d\:)?owner>/i);
        lockInfo.owner = m && m[1] ? Util.trim(m[1]) : null;

        var id = Util.createHash(Date.now() + "somethingrandom");
        var lockToken = "44445502-" + id.substr(0, 4) + "-" + id.substr(4, 4)
            + "-" + id.substr(8, 4) + "-" + id.substr(12, 12);

        lockInfo.token = lockToken;
        lockInfo.scope = /<(?:d\:)?exclusive/.test(xml.toLowerCase())
            ? jsDAV_Locks_LockInfo.EXCLUSIVE
            : jsDAV_Locks_LockInfo.SHARED;
        return lockInfo;
    }
});
