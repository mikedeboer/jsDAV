/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
var jsDAV = require("./../../jsdav"),

    Exc   = require("./../exceptions"),
    Util  = require("./../util");
/**
 * The Lock manager allows you to handle all file-locks centrally.
 *
 * This Lock Manager stores all its data in the filesystem. By default it will do
 * this in the system"s standard temporary (session) directory,
 * but this can be overriden by specifiying an alternative path in the contructor
 */
function jsDAV_Locks_Backend_FS(dataDir) {
    this.dataDir = dataDir;
}

(function() {
    this.getFileNameForUri = function(uri) {
        return this.dataDir + "/jsdav_" + md5(uri) + ".locks";
    };

    /**
     * Returns a list of jsDAV_Locks_LockInfo objects
     *
     * This method should return all the locks for a particular uri, including
     * locks that might be set on a parent uri.
     *
     * @param string uri
     * @return array
     */
    this.getLocks = function(uri, cbgetlocks) {
        var uriPart,
            lockList    = [],
            currentPath = "",
            parts       = uri.split("/");


        for (var i = 0, l = parts.length; i < l; ++i) {
            uriPart = parts[i];
            // weird algorithm that can probably be improved, but we"re traversing the path top down
            if (currentPath)
                currentPath += "/";
            currentPath += uriPart;

            this.getData(currentPath, function(err, uriLocks) {
                if (err)
                    return cbgetlocks(err);
                var lock, uriLock,
                    j  = 0,
                    l2 = uriLocks.length;
                for (; j < l2; ++j) {
                    uriLock = uriLocks[j];
                    // Unless we"re on the leaf of the uri-tree we should ingore locks with depth 0
                    if (uri == currentPath || uriLock.depth !== 0) {
                        uriLock.uri = currentPath;
                        lockList.push(uriLock);
                    }
                }

                // Checking if we can remove any of these locks
                for (j = lockList.length - 1; j >= 0; --j) {
                    lock = lockList[i];
                    if (Date.now() > lock.timeout + lock.created)
                        lockList.splice(j, 1);
                }
                cbgetlocks(null, lockList);
            });
        }
    }

    /**
     * Locks a uri
     *
     * @param string uri
     * @param jsDAV_Locks_LockInfo lockInfo
     * @return bool
     */
    this.lock = function(uri, lockInfo) {
        // We're making the lock timeout 30 minutes
        lockInfo.timeout = 1800;
        lockInfo.created = Date.now();

        var lock,
            locks = this.getLocks(uri);
        for (var i = locks.length - 1; i >= 0; --i) {// as k=>lock) {
            lock = locks[i];
            if (lock.token === lockInfo.token)
                locks.splice(i, 1);
        }
        locks.push(lockInfo);
        this.putData(uri, locks);
        return true;
    };

    /**
     * Removes a lock from a uri
     *
     * @param string uri
     * @param jsDAV_Locks_LockInfo lockInfo
     * @return bool
     */
    this.unlock = function(uri, lockInfo) {
        var lock,
            locks = this.getLocks(uri);
        for (var i = locks.length - 1; i >= 0; --i) {
            lock = locks[i];
            if (lock.token == lockInfo.token) {
                locks.splice(i, 1);
                this.putData(uri, locks);
                return true;
            }
        }
        return false;
    }

    /**
     * Returns the stored data for a uri
     *
     * @param string uri
     * @return array
     */
    this.getData = function(uri) {
        var path = this.getFilenameForUri(uri);
        if (!file_exists(path))
            return [];

        // opening up the file, and creating a shared lock
        var handle = fopen(path,"r");
        flock(handle,LOCK_SH);
        var data = "";

        // Reading data until the eof
        while (!feof(handle)) {
            data += fread(handle,8192);
        }

        // We"re all good
        fclose(handle);

        // Unserializing and checking if the resource file contains data for this file
        data = unserialize(data);
        if (!data)
            return [];
        return data;
    };

    /**
     * Updates the lock information
     *
     * @param string uri
     * @param array newData
     * @return void
     */
    this.putData = function(uri, newData, cbputdata) {
        var path = this.getFileNameForUri(uri);

        // opening up the file, and creating a shared lock
        var handle = fopen(path,"a+");
        flock(handle, LOCK_EX);
        ftruncate(handle,0);
        rewind(handle);

        fwrite(handle,serialize(newData));
        fclose(handle);
    };
}).call(jsDAV_Locks_Backend_FS.prototype = new jsDAV.jsDAV_Base());
