/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var Base = require("./../../../shared/base");
var jsDAV_Server = require("./../../server");

var Fs = require("fs");
var Path = require("path");
var Async = require("asyncjs");
var Util = require("./../../../shared/util");

/**
 * The Lock manager allows you to handle all file-locks centrally.
 *
 * This Lock Manager stores all its data in the filesystem. By default it will do
 * this in the system"s standard temporary (session) directory,
 * but this can be overriden by specifiying an alternative path in the contructor
 */
var jsDAV_Locks_Backend_FS = module.exports = Base.extend({
    initialize: function(dataDir) {
        this.dataDir = dataDir || jsDAV_Server.DEFAULT_TMPDIR + "/jsdav";
        // ensure that the path is there
        Async.makePath(this.dataDir, function() {});
    },

    getFilenameForUri: function(uri) {
        return this.dataDir + "/jsdav_" + Util.sha1(uri) + ".locks";
    },

    /**
     * Returns a list of jsDAV_Locks_LockInfo objects
     *
     * This method should return all the locks for a particular uri, including
     * locks that might be set on a parent uri.
     *
     * @param string uri
     * @return array
     */
    getLocks: function(uri, returnChildLocks, cbgetlocks) {
        var lockList    = [];
        var currentPath = "";
        var parts       = uri.split("/");
        var self        = this;

        Async.list(parts).each(function(uriPart, next) {
            // weird algorithm that can probably be improved, but we're traversing
            // the path top down
            if (currentPath)
                currentPath += "/";
            currentPath += uriPart;

            self.getData(currentPath, function(err, uriLocks) {
                if (err)
                    return next(err);
                var lock, uriLock, j;
                var i = 0;
                var l = uriLocks.length;
                for (; i < l; ++i) {
                    uriLock = uriLocks[i];
                    // Unless we're on the leaf of the uri-tree we should ingore
                    // locks with depth 0
                    if (uri == currentPath || uriLock.depth !== 0) {
                        uriLock.uri = currentPath;
                        lockList.push(uriLock);
                    }
                }

                // Checking if we can remove any of these locks
                for (j = lockList.length - 1; j >= 0; --j) {
                    lock = lockList[j];
                    if (Date.now() > lock.timeout + lock.created)
                        lockList.splice(j, 1);
                }
                next();
            });
        }).end(function(err) {
            if (err)
                return cbgetlocks(err);
            cbgetlocks(null, lockList);
        });
    },

    /**
     * Locks a uri
     *
     * @param string uri
     * @param jsDAV_Locks_LockInfo lockInfo
     * @return bool
     */
    lock: function(uri, lockInfo, cblock) {
        // We're making the lock timeout 30 minutes
        lockInfo.timeout = 1800;
        lockInfo.created = Date.now();

        var self = this;
        this.getLocks(uri, false, function(err, locks) {
            if (err)
                return cblock(err, false);

            for (var lock, i = locks.length - 1; i >= 0; --i) {
                lock = locks[i];
                if (lock.token === lockInfo.token)
                    locks.splice(i, 1);
            }
            locks.push(lockInfo);
            self.putData(uri, locks, function(err) {
                cblock(err, !!err);
            });
        });
    },

    /**
     * Removes a lock from a uri
     *
     * @param string uri
     * @param jsDAV_Locks_LockInfo lockInfo
     * @return bool
     */
    unlock: function(uri, lockInfo, cbunlock) {
        var self = this;
        this.getLocks(uri, false, function(err, locks) {
            for (var found = false, lock, i = locks.length - 1; i >= 0; --i) {
                lock = locks[i];
                if (lock.token === lockInfo.token) {
                    locks.splice(i, 1);
                    found = true;
                    break;
                }
            }
            if (found)
                self.putData(uri, locks, end);
            else
                end();

            function end(err) {
                cbunlock(err, !!err);
            }
        });
    },

    /**
     * Returns the stored data for a uri
     *
     * @param string uri
     * @return array
     */
    getData: function(uri, cbgetdata) {
        var path = this.getFilenameForUri(uri);
        Path.exists(path, function(exists) {
            if (!exists)
                return cbgetdata(null, []);

            Fs.readFile(path, "utf8", function(err, data) {
                cbgetdata(null, (err || !data) ? [] : JSON.parse(data));
            });
        });
    },

    /**
     * Updates the lock information
     *
     * @param string uri
     * @param array newData
     * @return void
     */
    putData: function(uri, newData, cbputdata) {
        var path = this.getFilenameForUri(uri);
        // opening up the file, and creating a shared lock
        Fs.writeFile(path, JSON.stringify(newData), "utf8", cbputdata);
    }
});
