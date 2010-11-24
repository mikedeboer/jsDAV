/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
var jsDAV                        = require("./../../jsdav"),
    jsDAV_ServerPlugin           = require("./../plugin").jsDAV_ServerPlugin,
    jsDAV_iLockable              = require("./../iLockable").jsDAV_iLockable,
    jsDAV_Property_SupportedLock = require("./../property/supportedLock").jsDAV_Property_SupportedLock,
    jsDAV_Property_LockDiscovery = require("./../property/lockDiscovery").jsDAV_Property_LockDiscovery,
    jsDAV_Locks_LockInfo         = require("./locks/lockinfo").jsDAV_Locks_LockInfo,

    Exc  = require("./../exceptions"),
    Util = require("./../util");

function jsDAV_Locks_Plugin(handler) {
    this.handler = handler;
    //this.locksBackend = locksBackend;
    this.locksBackend = null;
    this.initialize();
}

(function() {
    this.initialize = function(handler) {
        //this.handler.addEventListener("unknownMethod", this.unknownMethod.bind(this));
        //this.handler.addEventListener("beforeMethod", this.beforeMethod.bind(this));
        //this.handler.addEventListener("afterGetProperties", this.afterGetProperties.bind(this));
    };

    /**
     * This method is called by the Server if the user used an HTTP method
     * the server didn"t recognize.
     *
     * This plugin intercepts the LOCK and UNLOCK methods.
     *
     * @param string method
     * @return bool
     */
    this.unknownMethod = function(method) {
        if (method == "LOCK") {
            this.httpLock();
            return false;
        }
        else if (method == "UNLOCK") {
            this.httpUnlock();
            return false;
        }
    };

    /**
     * This method is called after most properties have been found
     * it allows us to add in any Lock-related properties
     *
     * @param string path
     * @param array properties
     * @return bool
     */
    this.afterGetProperties = function(path, newProperties) {
        var discard, node, val;
        for (var propName in newProperties["404"]) {
            discard = newProperties["404"][propName];
            node = null;
            switch (propName) {
                case "{DAV:}supportedlock" :
                    val = false;
                    if (this.locksBackend) {
                        val = true;
                    }
                    else {
                        if (!node)
                            node = this.handler.tree.getNodeForPath(path);
                        if (node.hasFeature(jsDAV.__ILOCKABLE__))
                            val = true;
                    }
                    newProperties["200"][propName] = new jsDAV_Property_SupportedLock(val);
                    delete newProperties["404"][propName];
                    break;
                case "{DAV:}lockdiscovery" :
                    newProperties["200"][propName] = new jsDAV_Property_LockDiscovery(this.getLocks(path));
                    delete newProperties["404"][propName];
                    break;
            }
        }
        return true;
    };

    /**
     * This method is called before the logic for any HTTP method is
     * handled.
     *
     * This plugin uses that feature to intercept access to locked resources.
     *
     * @param string method
     * @return bool
     */
    this.beforeMethod = function(method) {
        var lastLock = null;
        switch (method) {
            case "DELETE" :
            case "MKCOL" :
            case "PROPPATCH" :
            case "PUT" :
                if (!this.validateLock(null, lastLock))
                    throw new Exc.jsDAV_Exception_Locked(lastLock);
                break;
            case "MOVE" :
                if (!this.validateLock([
                      this.handler.getRequestUri(),
                      this.handler.calculateUri(this.handler.httpRequest.headers["destination"]),
                  ],lastLock))
                        throw new Exc.jsDAV_Exception_Locked(lastLock);
                break;
            case "COPY" :
                if (!this.validateLock(
                      this.handler.calculateUri(this.handler.httpRequest.headers["destination"]),
                      lastLock))
                        throw new Exc.jsDAV_Exception_Locked(lastLock);
                break;
        }
        return true;
    };

    /**
     * Use this method to tell the server this plugin defines additional
     * HTTP methods.
     *
     * This method is passed a uri. It should only return HTTP methods that are
     * available for the specified uri.
     *
     * @param string uri
     * @return array
     */
    this.getHTTPMethods = function(uri, node) {
        if (this.locksBackend || (node && node.hasFeature(jsDAV.__ILOCKABLE__)))
            return ["LOCK","UNLOCK"];
        return [];
    };

    /**
     * Returns a list of features for the HTTP OPTIONS Dav: header.
     *
     * In this case this is only the number 2. The 2 in the Dav: header
     * indicates the server supports locks.
     *
     * @return array
     */
    this.getFeatures = function() {
        return ["2"];
    };

    /**
     * Returns all lock information on a particular uri
     *
     * This function should return an array with Sabre_DAV_Locks_LockInfo objects.
     * If there are no locks on a file, return an empty array.
     *
     * Additionally there is also the possibility of locks on parent nodes, so
     * we'll need to traverse every part of the tree.
     *
     * @param string uri
     * @return array
     */
    this.getLocks = function(uri) {
        var uriPart, uriLocks, node, uriLock, j, l2,
            lockList    = [],
            currentPath = "",
            parts       = uri.split("/"),
            i           = 0,
            l           = parts.length;
        for (; i < l; ++i) {//explode("/",uri) as uriPart) {
            uriPart = parts[i];
            uriLocks = [];
            if (currentPath)
                currentPath += "/";
            currentPath += uriPart;
            try {
                node = this.handler.tree.getNodeForPath(currentPath);
                if (node instanceof jsDAV_ILockable)
                    uriLocks = node.getLocks();
            }
            catch (ex){
                // In case the node didn"t exist, this could be a lock-null request
                if (!(ex instanceof Exc.jsDAV_Exception_FileNotFound))
                    throw ex;
            }

            for (j = 0, l2 = uriLocks.length; j < l2; ++j) {// as uriLock) {
                // Unless we"re on the leaf of the uri-tree we should ingore locks with depth 0
                uriLock = uriLocks[j];
                if (uri == currentPath || uriLock.depth != 0) {
                    uriLock.uri = currentPath;
                    lockList.push(uriLock);
                }
            }
        }
        if (this.locksBackend)
            lockList = lockList.concat(this.locksBackend.getLocks(uri));
        return lockList;
    };

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
    this.httpLock = function() {
        var body, timeout,
            uri      = this.handler.getRequestUri(),
            lastLock = null;
        if (!this.validateLock(uri, lastLock)) {
            // If the existing lock was an exclusive lock, we need to fail
            if (!lastLock || lastLock.scope == jsDAV_Locks_LockInfo.EXCLUSIVE) {
                //var_dump(lastLock);
                throw new Exc.jsDAV_Exception_ConflictingLock(lastLock);
            }
        }

        if (body = this.handler.httpRequest.getBody(true)) {
            // This is a new lock request
            var lockInfo = this.parseLockRequest(body);
            lockInfo.depth = this.handler.getHTTPDepth();
            lockInfo.uri = uri;
            if (lastLock && lockInfo.scope != jsDAV_Locks_LockInfo.SHARED)
                throw new Exc.jsDAV_Exception_ConflictingLock(lastLock);
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
            throw new Exc.jsDAV_Exception_BadRequest("An xml body is required for lock requests");
        }

        if (timeout = this.getTimeoutHeader())
            lockInfo.timeout = timeout;

        var newFile = false;

        // If we got this far.. we should go check if this node actually exists.
        // If this is not the case, we need to create it first
        try {
            var node = this.handler.tree.getNodeForPath(uri);
            // We need to call the beforeWriteContent event for RFC3744
            this.handler.dispatchEvent("beforeWriteContent", [uri]);
        }
        catch (ex) {
            if (ex instanceof Exc.jsDAV_Exception_FileNotFound) {
                // It didn"t, lets create it
                this.handler.createFile(uri,fopen("php://memory","r"));
                newFile = true;
            }
        }

        this.lockNode(uri, lockInfo);

        this.handler.httpResponse.writeHead(newFile ? 201 : 200, {
            "Content-Type": "application/xml; charset=utf-8",
            "Lock-Token": "<opaquelocktoken:" + lockInfo.token + ">"
        });
        this.handler.httpResponse.end(this.generateLockResponse(lockInfo));
    };

    /**
     * Unlocks a uri
     *
     * This WebDAV method allows you to remove a lock from a node. The client
     * should provide a valid locktoken through the Lock-token http header.
     * The server should return 204 (No content) on success
     *
     * @return void
     */
    this.httpUnlock = function() {
        var uri       = this.handler.getRequestUri(),
            lockToken = this.handler.httpRequest.headers("lock-token");

        // If the locktoken header is not supplied, we need to throw a bad request exception
        if (!lockToken)
            throw new Exc.jsDAV_Exception_BadRequest("No lock token was supplied");

        var lock,
            locks = this.getLocks(uri),
            i     = 0,
            l     = locks.length;

        // We"re grabbing the node information, just to rely on the fact it will
        // throw a 404 when the node doesn"t exist
        //this.handler.tree.getNodeForPath(uri);

        for (; i < l; ++i) {//locks as lock) {
            lock = locks[i];
            if ("<opaquelocktoken:" + lock.token + ">" == lockToken) {
                this.unlockNode(uri, lock);
                this.handler.httpResponse.writeHead(204, {"Content-Length": "0"});
                this.handler.httpResponse.end();
                return;
            }
        }

        // If we got here, it means the locktoken was invalid
        throw new Exc.jsDAV_Exception_LockTokenMatchesRequestUri();
    }

    /**
     * Locks a uri
     *
     * All the locking information is supplied in the lockInfo object. The object
     * has a suggested timeout, but this can be safely ignored.
     * It is important that if the existing timeout is ignored, the property is
     * overwritten, as this needs to be sent back to the client.
     *
     * @param string uri
     * @param jsDAV_Locks_LockInfo lockInfo
     * @return void
     */
    this.lockNode = function(uri, lockInfo) {
        if (this.handler.emit("beforeLock", [uri,lockInfo]) === false)
            return;

        try {
            var node = this.handler.tree.getNodeForPath(uri);
            if (node.hasFeature(jsDAV.__ILOCKABLE__))
                return node.lock(lockInfo);
        }
        catch (ex) {
            // In case the node didn"t exist, this could be a lock-null request
            if (!(ex instanceof Exc.jsDAV_Exception_FileNotFound))
                throw ex;
        }
        if (this.locksBackend)
            return this.locksBackend.lock(uri, lockInfo);
        throw new Exc.jsDAV_Exception_MethodNotAllowed("Locking support is not "
            + "enabled for this resource. No Locking backend was found so if you "
            + "didn't expect this error, please check your configuration.");
    };

    /**
     * Unlocks a uri
     *
     * This method removes a lock from a uri. It is assumed all the supplied
     * information is correct and verified.
     *
     * @param string uri
     * @param jsDAV_Locks_LockInfo lockInfo
     * @return void
     */
    this.unlockNode = function(uri, lockInfo) {
        if (this.handler.emit("beforeUnlock", [uri,lockInfo]) === false)
            return;
        try {
            var node = this.handler.tree.getNodeForPath(uri);
            if (node.hasFeature(jsDAV.__ILOCKABLE__))
                return node.unlock(lockInfo);
        }
        catch (ex) {
            // In case the node didn"t exist, this could be a lock-null request
            if (!(ex instanceof Exc.jsDAV_Exception_FileNotFound))
                throw ex;
        }

        if (this.locksBackend)
            return this.locksBackend.unlock(uri, lockInfo);
    };


    /**
     * Returns the contents of the HTTP Timeout header.
     *
     * The method formats the header into an integer.
     *
     * @return int
     */
    this.getTimeoutHeader = function() {
        var header = this.handler.httpRequest.headers("timeout");
        if (header) {
            if (header.toLowerCase().indexOf("second-") === 0)
                header = parseInt(header.substr(7));
            else if (header.toLowerCase() == "infinite")
                header = jsDAV_Locks_LockInfo.TIMEOUT_INFINITE;
            else
                throw new Exc.jsDAV_Exception_BadRequest("Invalid HTTP timeout header");
        }
        else {
            header = 0;
        }

        return header;
    };

    /**
     * Generates the response for successfull LOCK requests
     *
     * @param jsDAV_Locks_LockInfo lockInfo
     * @return string
     */
    this.generateLockResponse = function(lockInfo) {
        var dom = new DOMDocument("1.0","utf-8");
        dom.formatOutput = true;

        var prop = dom.createElementNS("DAV:","d:prop");
        dom.appendChild(prop);

        var lockDiscovery = dom.createElementNS("DAV:","d:lockdiscovery");
        prop.appendChild(lockDiscovery);

        var lockObj = new Sabre_DAV_Property_LockDiscovery(array(lockInfo),true);
        lockObj.serialize(this.handler,lockDiscovery);

        return dom.saveXML();
    };

    /**
     * validateLock should be called when a write operation is about to happen.
     * It will check if the requested url is locked, and see if the correct lock
     * tokens are passed.
     *
     * @param mixed urls     List of relevant urls. Can be an array, a string or
     *                       nothing at all for the current request uri
     * @param mixed lastLock This variable will be populated with the last checked
     *                       lock object (jsDAV_Locks_LockInfo)
     * @return bool
     */
    this.validateLock = function(urls, lastLock) {
        urls = urls || null;
        lastLock = lastLock || null;
        if (urls === null) {
            urls = [this.handler.getRequestUri()];
        }
        else if (typeof urls == "string") {
            urls = [urls];
        }
        else if (urls.length) {
            throw new Exc.jsDAV_Exception("The urls parameter should either be null, a string or an array");
        }

        var url, locks, condition, conditionUri, conditionToken, etagValid, lockValid,
            uri, node, lockToken, j, l2, k, l3, lockIndex, l4, lock,
            conditions = this.getIfConditions(),
            i          = 0,
            l          = urls.length;

        // We're going to loop through the urls and make sure all lock conditions
        // are satisfied
        for (; i < l; ++i) {
            url   = urls[i];
            locks = this.getLocks(url);

            // If there were no conditions, but there were locks, we fail
            if (!conditions && locks) {
                i = 0;
                lastLock = locks[0];
                return false;
            }

            // If there were no locks or conditions, we go to the next url
            if (!locks && !conditions) continue;

            for (j = 0, l2 = conditions.length; j < l2; ++j) {
                condition = conditions[j];
                conditionUri = condition["uri"] ? this.handler.calculateUri(condition["uri"]) : "";

                // If the condition has a url, and it isn"t part of the affected
                // url at all, check the next condition
                if (conditionUri && url.indexOf(conditionUri) !== 0) continue;

                // The tokens array contians arrays with 2 elements. 0=true/false
                // for normal/not condition, 1=locktoken
                // At least 1 condition has to be satisfied
                for (k = 0, l3 = condition["tokens"].length; k < l3; ++k) {
                    conditionToken = condition["tokens"][k];
                    etagValid      = true;
                    lockValid      = true;

                    // key 2 can contain an etag
                    if (conditionToken[2]) {
                        uri       = conditionUri ? conditionUri : this.handler.getRequestUri();
                        node      = this.handler.tree.getNodeForPath(uri);
                        etagValid = node.getETag() == conditionToken[2];
                    }

                    // key 1 can contain a lock token
                    if (conditionToken[1]) {
                        lockValid = false;
                        // Match all the locks
                        for (lockIndex = 0, l4 = locks.length; lockIndex < l4; ++lockIndex) {//locks as lockIndex=>lock) {
                            lock      = locks[lockIndex];
                            lockToken = "opaquelocktoken:" + lock.token;

                            // Checking NOT
                            if (!conditionToken[0] && lockToken != conditionToken[1]) {
                                // Condition valid, onto the next
                                lockValid = true;
                                break;
                            }
                            if (conditionToken[0] && lockToken == conditionToken[1]) {
                                lastLock = lock;
                                // Condition valid and lock matched
                                delete locks[lockIndex];
                                lockValid = true;
                                break;
                            }
                        }
                    }

                    // If, after checking both etags and locks they are stil valid,
                    // we can continue with the next condition.
                    if (etagValid && lockValid)
                        continue;
               }
               // No conditions matched, so we fail
               throw new Exc.jsDAV_Exception_PreconditionFailed("The tokens "
                   + "provided in the if header did not match", "If");
            }

            // Conditions were met, we"ll also need to check if all the locks are gone
            if (locks.length) {
                i = 0;
                // There"s still locks, we fail
                lastLock = locks[i];
                return false;
            }
        }

        // We got here, this means every condition was satisfied
        return true;
    };

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
    this.getIfConditions = function() {
        var header = this.handler.httpRequest.headers("if");
        if (!header)
            return [];

        var matches    = [],
            conditions = [];

        header.replace(/(?:\<(?P<uri>.*?)\>\s)?\((?P<not>Not\s)?(?:\<(?P<token>[^\>]*)\>)?(?:\s?)(?:\[(?P<etag>[^\]]*)\])?\)/gi,
          function(m, uri, not, token, etag) {
              var condition = {
                  "uri"    : uri,
                  "tokens" : [
                      [not ? 0 : 1, token, etag ? etag : ""]
                  ]
              };

              if (!condition["uri"] && conditions.length) {
                  conditions[conditions.length - 1]["tokens"].push([
                      not ? 0 : 1,
                      token,
                      etag ? etag : ""
                  ]);
              }
              else {
                  conditions.push(condition);
              }
          });

        return conditions;
    };

    /**
     * Parses a webdav lock xml body, and returns a new Sabre_DAV_Locks_LockInfo object
     *
     * @param string body
     * @return Sabre_DAV_Locks_LockInfo
     */
    this.parseLockRequest = function(body) {
        var xml = simplexml_load_string(body,null,LIBXML_NOWARNING);
        xml.registerXPathNamespace("d","DAV:");
        var lockInfo = new Sabre_DAV_Locks_LockInfo();

        lockInfo.owner = xml.owner;

        var lockToken = "44445502";
        var id = md5(microtime() + "somethingrandom");
        lockToken+="-" + substr(id,0,4) + "-" + substr(id,4,4) + "-" + substr(id,8,4) + "-" + substr(id,12,12);

        lockInfo.token = lockToken;
        lockInfo.scope = xml.xpath("d:lockscope/d:exclusive").length > 0
            ? jsDAV_Locks_LockInfo.EXCLUSIVE
            : jsDAV_Locks_LockInfo.SHARED;

        return lockInfo;
    };
}).call(jsDAV_Locks_Plugin.prototype = new jsDAV_ServerPlugin());

module.exports = jsDAV_Locks_Plugin;
