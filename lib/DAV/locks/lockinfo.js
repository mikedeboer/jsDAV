/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV = require("./../../jsdav"),
    Util  = require("./../util");

/**
 * LockInfo class
 *
 * An object of the LockInfo class holds all the information relevant to a
 * single lock.
 */
function jsDAV_Locks_LockInfo() {}

exports.jsDAV_Locks_LockInfo = jsDAV_Locks_LockInfo;

/**
 * A shared lock
 */
jsDAV_Locks_LockInfo.SHARED           = 1;

/**
 * An exclusive lock
 */
jsDAV_Locks_LockInfo.EXCLUSIVE        = 2;

/**
 * A never expiring timeout
 */
jsDAV_Locks_LockInfo.TIMEOUT_INFINITE = -1;

(function() {
    this.REGBASE = this.REGBASE | jsDAV.__LOCKINFO__;

    /**
     * The owner of the lock
     *
     * @var string
     */
    this.owner;

    /**
     * The locktoken
     *
     * @var string
     */
    this.token;

    /**
     * How long till the lock is expiring
     *
     * @var int
     */
    this.timeout;

    /**
     * UNIX Timestamp of when this lock was created
     *
     * @var int
     */
    this.created;

    /**
     * Exclusive or shared lock
     *
     * @var int
     */
    this.scope = jsDAV_Locks_LockInfo.EXCLUSIVE;

    /**
     * Depth of lock, can be 0 or Sabre_DAV_Server::DEPTH_INFINITY
     */
    this.depth = 0;

    /**
     * The uri this lock locks
     *
     * @todo: This value is not always set
     */
    this.uri;
}).call(jsDAV_Locks_LockInfo.prototype = new jsDAV.jsDAV_Base());
