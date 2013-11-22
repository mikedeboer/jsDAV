/*
 * @package jsDAV
 * @subpackage DAVACL
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_ServerPlugin = require("./../DAV/plugin");
var jsDAV_Property_Href = require("./../DAV/property/href");
var jsDAV_Property_HrefList = require("./../DAV/property/hrefList");
var jsDAV_Property_Response = require("./../DAV/property/response");
var jsDAV_Property_ResponseList = require("./../DAV/property/responseList");
var jsDAV_iHref = require("./../DAV/interfaces/iHref");
var jsDAVACL_iPrincipal = require("./interfaces/iPrincipal");
var jsDAVACL_iACL = require("./interfaces/iAcl");
var jsDAVACL_iPrincipalCollection = require("./interfaces/iPrincipalCollection");
var jsDAVACL_Property_Principal = require("./property/principal");
var jsDAVACL_Property_SupportedPrivilegeSet = require("./property/supportedPrivilegeSet");
var jsDAVACL_Property_CurrentUserPrivilegeSet = require("./property/currentUserPrivilegeSet");
var jsDAVACL_Property_Acl = require("./property/acl");
var jsDAVACL_Property_AclRestrictions = require("./property/aclRestrictions");

var AsyncEventEmitter = require("./../shared/asyncEvents").EventEmitter;
var Exc = require("./../shared/exceptions");
var Util = require("./../shared/util");
var Xml = require("./../shared/xml");

var Async = require("asyncjs");

/**
 * jsDAV ACL Plugin
 *
 * This plugin provides functionality to enforce ACL permissions.
 * ACL is defined in RFC3744.
 *
 * In addition it also provides support for the {DAV:}current-user-principal
 * property, defined in RFC5397 and the {DAV:}expand-property report, as
 * defined in RFC3253.
 */
var jsDAVACL_Plugin = module.exports = jsDAV_ServerPlugin.extend({
    /**
     * Plugin name
     *
     * @var String
     */
    name: "acl",

    /**
     * Recursion constants
     *
     * This only checks the base node
     */
    R_PARENT: 1,

    /**
     * Recursion constants
     *
     * This checks every node in the tree
     */
    R_RECURSIVE: 2,

    /**
     * Recursion constants
     *
     * This checks every parentnode in the tree, but not leaf-nodes.
     */
    R_RECURSIVEPARENTS: 3,

    /**
     * Reference to server object.
     *
     * @var jsDAV_Handler
     */
    handler: null,

    /**
     * List of urls containing principal collections.
     * Modify this if your principals are located elsewhere.
     *
     * @var array
     */
    principalCollectionSet: [
        "principals"
    ],

    /**
     * By default ACL is only enforced for nodes that have ACL support (the
     * ones that implement IACL). For any other node, access is
     * always granted.
     *
     * To override this behaviour you can turn this setting off. This is useful
     * if you plan to fully support ACL in the entire tree.
     *
     * @var bool
     */
    allowAccessToNodesWithoutACL: true,

    /**
     * By default nodes that are inaccessible by the user, can still be seen
     * in directory listings (PROPFIND on parent with Depth: 1)
     *
     * In certain cases it's desirable to hide inaccessible nodes. Setting this
     * to true will cause these nodes to be hidden from directory listings.
     *
     * @var bool
     */
    hideNodesFromListings: false,

    /**
     * This {String} is prepended to the username of the currently logged in
     * user. This allows the plugin to determine the principal path based on
     * the username.
     *
     * @var string
     */
    defaultUsernamePath: "principals",

    /**
     * This list of properties are the properties a client can search on using
     * the {DAV:}principal-property-search report.
     *
     * The keys are the property names, values are descriptions.
     *
     * @var Object
     */
    principalSearchPropertySet: {
        "{DAV:}displayname": "Display name",
        "{http://ajax.org/2005/aml}email-address": "Email address"
    },

    /**
     * Any principal uri's added here, will automatically be added to the list
     * of ACL's. They will effectively receive {DAV:}all privileges, as a
     * protected privilege.
     *
     * @var array
     */
    adminPrincipals: [],

    /**
     * Sets up the plugin
     *
     * This method is automatically called by the server class.
     *
     * @param jsDAV_Handler handler
     * @return void
     */
    initialize: function(handler) {
        this.handler = handler;

        var options = this.handler.server.options;
        if (options.allowAccessToNodesWithoutACL)
            this.allowAccessToNodesWithoutACL = options.allowAccessToNodesWithoutACL;
        if (options.hideNodesFromListings)
            this.hideNodesFromListings = options.hideNodesFromListings;
        if (options.defaultUsernamePath)
            this.defaultUsernamePath = options.defaultUsernamePath;
        if (options.adminPrincipals)
            this.adminPrincipals = Util.makeUnique(this.adminPrincipals.concat(options.adminPrincipals));

        handler.addEventListener("beforeGetProperties", this.beforeGetProperties.bind(this));
        handler.addEventListener("beforeMethod", this.beforeMethod.bind(this), AsyncEventEmitter.PRIO_HIGH);
        handler.addEventListener("beforeBind", this.beforeBind.bind(this), AsyncEventEmitter.PRIO_HIGH);
        handler.addEventListener("beforeUnbind", this.beforeUnbind.bind(this), AsyncEventEmitter.PRIO_HIGH);
        handler.addEventListener("updateProperties",this.updateProperties.bind(this));
        handler.addEventListener("beforeUnlock", this.beforeUnlock.bind(this), AsyncEventEmitter.PRIO_HIGH);
        handler.addEventListener("report",this.report.bind(this));
        handler.addEventListener("unknownMethod", this.unknownMethod.bind(this));

        handler.protectedProperties.push(
            "{DAV:}alternate-URI-set",
            "{DAV:}principal-URL",
            "{DAV:}group-membership",
            "{DAV:}principal-collection-set",
            "{DAV:}current-user-principal",
            "{DAV:}supported-privilege-set",
            "{DAV:}current-user-privilege-set",
            "{DAV:}acl",
            "{DAV:}acl-restrictions",
            "{DAV:}inherited-acl-set",
            "{DAV:}owner",
            "{DAV:}group"
        );
        handler.protectedProperties = Util.makeUnique(handler.protectedProperties);

        // Automatically mapping nodes implementing IPrincipal to the
        // {DAV:}principal resourcetype.
        handler.resourceTypeMapping["{DAV:}principal"] = jsDAVACL_iPrincipal;

        // Mapping the group-member-set property to the HrefList property
        // class.
        handler.propertyMap["{DAV:}group-member-set"] = jsDAV_Property_HrefList;
    },

    /**
     * Returns a list of features added by this plugin.
     *
     * This list is used in the response of a HTTP OPTIONS request.
     *
     * @return array
     */
    getFeatures: function() {
        return ["access-control", "calendarserver-principal-property-search"];
    },

    /**
     * Returns a list of available methods for a given url
     *
     * @param {String} uri
     * @return array
     */
    getHTTPMethods: function(uri) {
        return ["ACL"];
    },

    /**
     * Returns a list of reports this plugin supports.
     *
     * This will be used in the {DAV:}supported-report-set property.
     * Note that you still need to subscribe to the 'report' event to actually
     * implement them
     *
     * @param {String} uri
     * @return array
     */
    getSupportedReportSet: function(uri, callback) {
        callback(null, [
            "{DAV:}expand-property",
            "{DAV:}principal-property-search",
            "{DAV:}principal-search-property-set",
        ]);
    },

    /**
     * Checks if the current user has the specified privilege(s).
     *
     * You can specify a single privilege, or a list of privileges.
     * This method will throw an exception if the privilege is not available
     * and return true otherwise.
     *
     * @param {String} uri
     * @param array|string privileges
     * @param number recursion
     * @throws jsDAV_Exception_NeedPrivileges
     * @return bool
     */
    checkPrivileges: function(uri, privileges, recursion, callback) {
        if (!Array.isArray(privileges))
            privileges = [privileges];

        recursion = recursion || this.R_PARENT;
        var self = this;

        this.getCurrentUserPrivilegeSet(uri, function(err, acl) {
            if (err)
                return callback(err);

            if (!acl) {
                if (self.allowAccessToNodesWithoutACL)
                    return callback(null, true);
                else
                    return callback(new Exc.NeedPrivileges(uri, privileges), false);
            }

            var failed = privileges.filter(function(priv) {
                return acl.indexOf(priv) === -1;
            });

            if (failed.length)
                return callback(new Exc.NeedPrivileges(uri, failed), false);

            callback(null, true);
        });
    },

    /**
     * Returns the standard users' principal.
     *
     * This is one authorative principal url for the current user.
     * This method will return null if the user wasn't logged in.
     *
     * @return string|null
     */
    getCurrentUserPrincipal: function(callback) {
        var authPlugin = this.handler.plugins.auth;

        if (!authPlugin)
            return callback();
        /** @var authPlugin jsDAV_Auth_Plugin */

        var self = this;
        authPlugin.getCurrentUser(function(err, userName) {
            if (err)
                return callback(err);
            if (!userName)
                return callback();
            callback(null, self.defaultUsernamePath + "/" + userName);
        });
    },


    /**
     * Returns a list of principals that's associated to the current
     * user, either directly or through group membership.
     *
     * @return array
     */
    getCurrentUserPrincipals: function(callback) {
        var self = this;
        this.getCurrentUserPrincipal(function(err, currentUser) {
            if (err)
                return callback(err);
            if (!currentUser)
                return callback(null, []);

            self.getPrincipalMembership(currentUser, function(err, membership) {
                if (err)
                    return callback(err);
                callback(null, [currentUser].concat(membership));
            });
        });
    },

    /**
     * This object holds a cache for all the principals that are associated with
     * a single principal.
     *
     * @var object
     */
    principalMembershipCache: {},

    /**
     * Returns all the principal groups the specified principal is a member of.
     *
     * @param {String} principal
     * @return array
     */
    getPrincipalMembership: function(mainPrincipal, callback) {
        // First check our cache
        if (this.principalMembershipCache[mainPrincipal])
            return callback(null, this.principalMembershipCache[mainPrincipal]);

        var check = [mainPrincipal];
        var principals = [];
        var self = this;

        function checkNext() {
            var principal = check.shift();
            if (!principal)
                return checkedAll();

            self.handler.getNodeForPath(principal, function(err, node) {
                if (err)
                    return checkedAll(err);

                if (node.hasFeature(jsDAVACL_iPrincipal)) {
                    node.getGroupMembership(function(err, memberships) {
                        if (err)
                            return checkedAll(err);

                        memberships.forEach(function(groupMember) {
                            if (principals.indexOf(groupMember) === -1) {
                                check.push(groupMember);
                                principals.push(groupMember);
                            }
                        });
                        checkNext();
                    });
                }
                else
                    checkNext();
            });
        }

        function checkedAll(err) {
            if (err)
                return callback(err, []);

            // Store the result in the cache
            self.principalMembershipCache[mainPrincipal] = principals;

            callback(err, principals);
        }

        checkNext();
    },

    /**
     * Returns the supported privilege structure for this ACL plugin.
     *
     * See RFC3744 for more details. Currently we default on a simple,
     * standard structure.
     *
     * You can either get the list of privileges by a uri (path) or by
     * specifying a Node.
     *
     * @param string|DAV\INode node
     * @return array
     */
    getSupportedPrivilegeSet: function(node, callback) {
        var self = this;

        if (!node.hasFeature) {
            this.handler.getNodeForPath(node, function(err, n) {
                if (err)
                    return callback(err);
                node = n;
                gotNodePrivSet();
            });
        }
        else
            gotNodePrivSet();

        function gotNodePrivSet() {
            if (node.hasFeature(jsDAVACL_iACL))
                return callback(null, node.getSupportedPrivilegeSet() || self.getDefaultSupportedPrivilegeSet());
            callback(null, self.getDefaultSupportedPrivilegeSet());
        }
    },

    /**
     * Returns a fairly standard set of privileges, which may be useful for
     * other systems to use as a basis.
     *
     * @return array
     */
    getDefaultSupportedPrivilegeSet: function() {
        return {
            "privilege"  : "{DAV:}all",
            "abstract"   : true,
            "aggregates" : [
                {
                    "privilege"  : "{DAV:}read",
                    "aggregates" : [
                        {
                            "privilege" : "{DAV:}read-acl",
                            "abstract"  : true
                        },
                        {
                            "privilege" : "{DAV:}read-current-user-privilege-set",
                            "abstract"  : true
                        }
                    ]
                }, // {DAV:}read
                {
                    "privilege"  : "{DAV:}write",
                    "aggregates" : [
                        {
                            "privilege" : "{DAV:}write-acl",
                            "abstract"  : true
                        },
                        {
                            "privilege" : "{DAV:}write-properties",
                            "abstract"  : true
                        },
                        {
                            "privilege" : "{DAV:}write-content",
                            "abstract"  : true
                        },
                        {
                            "privilege" : "{DAV:}bind",
                            "abstract"  : true
                        },
                        {
                            "privilege" : "{DAV:}unbind",
                            "abstract"  : true
                        },
                        {
                            "privilege" : "{DAV:}unlock",
                            "abstract"  : true
                        }
                    ]
                } // {DAV:}write
            ]
        }; // {DAV:}all
    },

    /**
     * Returns the supported privilege set as a flat list
     *
     * This is much easier to parse.
     *
     * The returned list will be index by privilege name.
     * The value is a struct containing the following properties:
     *   - aggregates
     *   - abstract
     *   - concrete
     *
     * @param string|DAV\INode node
     * @return array
     */
    getFlatPrivilegeSet: function(node, callback) {
        this.getSupportedPrivilegeSet(node, function(err, privs) {
            if (err)
                return callback(err);

            var flat = {};

            // Traverses the privilege set tree for reordering
            function getFPSTraverse(priv, isConcrete) {
                var myPriv = {
                    "privilege" : priv.privilege,
                    "abstract" : !!priv.abstract && priv.abstract,
                    "aggregates" : [],
                    "concrete" : !!priv.abstract && priv.abstract ? isConcrete : priv.privilege
                };

                if (priv.aggregates) {
                    priv.aggregates.forEach(function(subPriv) {
                        myPriv.aggregates.push(subPriv.privilege);
                    });
                }

                flat[priv.privilege] = myPriv;

                if (priv.aggregates) {
                    priv.aggregates.forEach(function(subPriv) {
                        getFPSTraverse(subPriv, myPriv.concrete);
                    });
                }
            }

            getFPSTraverse(privs, null);
            callback(null, flat);
        });
    },

    /**
     * Returns the full ACL list.
     *
     * Either a uri or a DAV\INode may be passed.
     *
     * null will be returned if the node doesn't support ACLs.
     *
     * @param string|DAV\INode node
     * @return array
     */
    getACL: function(node, callback) {
        var self = this;

        if (typeof node == "string") {
            this.handler.getNodeForPath(node, function(err, n) {
                if (err)
                    return callback(err);
                node = n;
                gotNodeACL();
            });
        }
        else
            gotNodeACL();

        function gotNodeACL() {
            if (!node.hasFeature(jsDAVACL_iACL))
                return callback();

            var acl = node.getACL();
            self.adminPrincipals.forEach(function(adminPrincipal) {
                acl.push({
                    "principal" : adminPrincipal,
                    "privilege" : "{DAV:}all",
                    "protected" : true
                });
            });
            callback(null, acl);
        }
    },

    /**
     * Returns a list of privileges the current user has
     * on a particular node.
     *
     * Either a uri or a jsDAV_iNode may be passed.
     *
     * null will be returned if the node doesn't support ACLs.
     *
     * @param string|jsDAV_iNode node
     * @return array
     */
    getCurrentUserPrivilegeSet: function(node, callback) {
        var self = this;
        if (typeof node == "string") {
            this.handler.getNodeForPath(node, function(err, n) {
                if (err)
                    return callback(err);
                node = n;
                gotNode();
            });
        }
        else
            gotNode();

        function gotNode() {
            self.getACL(node, function(err, acl) {
                if (err)
                    return callback(err);
                if (!acl)
                    return callback();

                self.getCurrentUserPrincipals(function(err, principals) {
                    if (err)
                        return callback(err);

                    var collected = [];

                    acl.forEach(function(ace) {
                        var principal = ace.principal;
                        switch (principal) {
                            case "{DAV:}owner" :
                                var owner = node.getOwner();
                                if (owner && principals.indexOf(owner) > -1)
                                    collected.push(ace);
                                break;
                            // 'all' matches for every user
                            case "{DAV:}all" :
                            // 'authenticated' matched for every user that's logged in.
                            // Since it's not possible to use ACL while not being logged
                            // in, this is also always true.
                            case "{DAV:}authenticated" :
                                collected.push(ace);
                                break;
                            // 'unauthenticated' can never occur either, so we simply
                            // ignore these.
                            case "{DAV:}unauthenticated" :
                                break;
                            default :
                                if (principals.indexOf(ace.principal) > -1)
                                    collected.push(ace);
                                break;
                        }
                    });

                    // Now we deduct all aggregated privileges.
                    self.getFlatPrivilegeSet(node, function(err, flat) {
                        if (err)
                            return callback(err);

                        var current;
                        var collected2 = [];
                        while (collected.length) {
                            current = collected.pop();
                            collected2.push(current.privilege);

                            flat[current.privilege].aggregates.forEach(function(subPriv) {
                                collected2.push(subPriv);
                                collected.push(flat[subPriv]);
                            });
                        }

                        callback(null, Util.makeUnique(collected2));
                    });
                });
            });
        }
    },

    /**
     * Principal property search
     *
     * This method can search for principals matching certain values in
     * properties.
     *
     * This method will return a list of properties for the matched properties.
     *
     * @param {Array} searchProperties    The properties to search on. This is a
     *                                   key-value list. The keys are property
     *                                   names, and the values the strings to
     *                                   match them on.
     * @param {Array} requestedProperties This is the list of properties to
     *                                   return for every match.
     * @param {String} collectionUri      The principal collection to search on.
     *                                   If this is ommitted, the standard
     *                                   principal collection-set will be used.
     * @return {Array}     This method returns an array structure similar to
     *                   jsDAV_Handler.getPropertiesForPath. Returned
     *                   properties are index by a HTTP status code.
     *
     */
    principalSearch: function(searchProperties, requestedProperties, collectionUri, callback) {
        var uris = collectionUri ? [collectionUri] : this.principalCollectionSet;
        var lookupResults = [];
        var self = this;

        Async.list(uris)
            .each(function(uri, next) {
                self.handler.getNodeForPath(uri, function(err, principalCollection) {
                    if (err)
                        return next(err);

                    if (!principalCollection.hasFeature(jsDAVACL_iPrincipalCollection)) {
                        // Not a principal collection, we're simply going to ignore
                        // this.
                        return next();
                    }

                    principalCollection.searchPrincipals(searchProperties, function(err, results) {
                        if (err)
                            return next(err);

                        results.forEach(function(result) {
                            lookupResults.push(Util.rtrim(uri, "/") + "/" + result);
                        });
                        next();
                    });
                });
            })
            .end(function(err) {
                if (err)
                    return callback(err);

                var matches = [];
                Async.list(lookupResults)
                    .each(function(lookupResult, next) {
                        self.handler.getPropertiesForPath(lookupResult, requestedProperties, 0, function(err, props) {
                            if (err)
                                return next(err);

                            matches.push(props);
                            next();
                        });
                    })
                    .end(function(err) {
                        callback(err, matches)
                    });
            });
    },

    /**
     * Triggered before any method is handled
     *
     * @param {String} method
     * @param {String} uri
     * @return void
     */
    beforeMethod: function(e, method, uri) {
        var self = this;
        this.handler.getNodeForPath(uri, function(err, node) {
            // do not yield errors:
            // If the node doesn't exists, none of these checks apply
            if (err)
                return e.next();

            function cont(err) {
                e.next(err);
            }

            switch(method) {
                case "GET" :
                case "HEAD" :
                case "OPTIONS" :
                    // For these 3 we only need to know if the node is readable.
                    self.checkPrivileges(uri, "{DAV:}read", null, cont);
                    break;
                case "PUT" :
                case "LOCK" :
                case "UNLOCK" :
                    // This method requires the write-content priv if the node
                    // already exists, and bind on the parent if the node is being
                    // created.
                    // The bind privilege is handled in the beforeBind event.
                    self.checkPrivileges(uri, "{DAV:}write-content", null, cont);
                    break;
                case "PROPPATCH" :
                    self.checkPrivileges(uri, "{DAV:}write-properties", null, cont);
                    break;
                case "ACL" :
                    self.checkPrivileges(uri, "{DAV:}write-acl", null, cont);
                    break;
                case "COPY" :
                case "MOVE" :
                    // Copy requires read privileges on the entire source tree.
                    // If the target exists write-content normally needs to be
                    // checked, however, we're deleting the node beforehand and
                    // creating a new one after, so this is handled by the
                    // beforeUnbind event.
                    //
                    // The creation of the new node is handled by the beforeBind
                    // event.
                    //
                    // If MOVE is used beforeUnbind will also be used to check if
                    // the sourcenode can be deleted.
                    self.checkPrivileges(uri, "{DAV:}read", self.R_RECURSIVE, cont);
                    break;
                default:
                    e.next();
                    break;
            }
        });
    },

    /**
     * Triggered before a new node is created.
     *
     * This allows us to check permissions for any operation that creates a
     * new node, such as PUT, MKCOL, MKCALENDAR, LOCK, COPY and MOVE.
     *
     * @param {String} uri
     * @return void
     */
    beforeBind: function(e, uri) {
        var parentUri = Util.splitPath(uri)[0];
        this.checkPrivileges(parentUri, "{DAV:}bind", null, e.next.bind(e));
    },

    /**
     * Triggered before a node is deleted
     *
     * This allows us to check permissions for any operation that will delete
     * an existing node.
     *
     * @param {String} uri
     * @return void
     */
    beforeUnbind: function(e, uri) {
        var parentUri = Util.splitPath(uri)[0];
        this.checkPrivileges(parentUri, "{DAV:}unbind", this.R_RECURSIVEPARENTS, e.next.bind(e));
    },

    /**
     * Triggered before a node is unlocked.
     *
     * @param {String} uri
     * @param DAV\Locks\LockInfo lock
     * @TODO: not yet implemented
     * @return void
     */
    beforeUnlock: function(e, uri, lock) {
        e.next();
    },

    /**
     * Triggered before properties are looked up in specific nodes.
     *
     * @param {String} uri
     * @param jsDAV_iNode node
     * @param {Array} requestedProperties
     * @param {Object} returnedProperties
     * @TODO really should be broken into multiple methods, or even a class.
     * @return bool
     */
    beforeGetProperties: function(e, uri, node, requestedProperties, returnedProperties) {
        var self = this;
        // Checking the read permission
        this.checkPrivileges(uri,"{DAV:}read", this.R_PARENT, function(err, hasPriv) {
            if (!hasPriv) {
                // User is not allowed to read properties
                if (self.hideNodesFromListings)
                    return e.stop();

                // Marking all requested properties as '403'.
                Object.keys(requestedProperties).forEach(function(prop) {
                    returnedProperties["403"][prop] = null;
                    delete requestedProperties[prop];
                });
                return e.next();
            }

            var propHandlers = {
                "{DAV:}alternate-uri-set": function(prop, next) {
                    delete requestedProperties[prop];
                    returnedProperties["200"]["{DAV:}alternate-URI-set"] = jsDAV_Property_HrefList.new(node.getAlternateUriSet());
                    next();
                },
                "{DAV:}principal-url": function(prop, next) {
                    delete requestedProperties[prop];
                    returnedProperties["200"]["{DAV:}principal-URL"] = jsDAV_Property_Href.new(node.getPrincipalUrl() + "/");
                    next();
                },
                "{DAV:}group-member-set": function(prop, next) {
                    delete requestedProperties[prop];
                    node.getGroupMemberSet(function(err, memberSet) {
                        if (err)
                            return next(err);
                        returnedProperties["200"]["{DAV:}group-member-set"] = jsDAV_Property_HrefList.new(memberSet);
                        next();
                    });
                },
                "{DAV:}group-membership": function(prop, next) {
                    delete requestedProperties[prop];
                    node.getGroupMembership(function(err, membership) {
                        if (err)
                            return next(err);
                        returnedProperties["200"]["{DAV:}group-membership"] = jsDAV_Property_HrefList.new(membership);
                        next();
                    });
                },
                "{DAV:}displayname": function(prop, next) {
                    returnedProperties["200"]["{DAV:}displayname"] = node.getDisplayName();
                    next();
                },
                "{DAV:}principal-collection-set": function(prop, next) {
                    delete requestedProperties[prop];
                    var val = [].concat(self.principalCollectionSet);
                    // Ensuring all collections end with a slash
                    for (var i = 0, l = val.length; i > l; ++i)
                        val[i] = val[i] + "/";
                    returnedProperties["200"]["{DAV:}principal-collection-set"] = jsDAV_Property_HrefList.new(val);
                    next();
                },
                "{DAV:}current-user-principal": function(prop, next) {
                    delete requestedProperties[prop];
                    self.getCurrentUserPrincipal(function(err, url) {
                        if (err)
                            return next(err);
                        if (url)
                            returnedProperties["200"]["{DAV:}current-user-principal"] = jsDAVACL_Property_Principal.new(jsDAVACL_Property_Principal.HREF, url + "/");
                        else
                            returnedProperties["200"]["{DAV:}current-user-principal"] = jsDAVACL_Property_Principal.new(jsDAVACL_Property_Principal.UNAUTHENTICATED);
                        next();
                    });
                },
                "{DAV:}supported-privilege-set": function(prop, next) {
                    delete requestedProperties[prop];
                    self.getSupportedPrivilegeSet(node, function(err, privSet) {
                        if (err)
                            return next(err);
                        returnedProperties["200"]["{DAV:}supported-privilege-set"] = jsDAVACL_Property_SupportedPrivilegeSet.new(privSet);
                        next();
                    });
                },
                "{DAV:}current-user-privilege-set": function(prop, next) {
                    self.checkPrivileges(uri, "{DAV:}read-current-user-privilege-set", self.R_PARENT, function(err, hasPriv) {
                        if (!hasPriv) {
                            returnedProperties["403"]["{DAV:}current-user-privilege-set"] = null;
                            delete requestedProperties[prop];
                            next();
                        }
                        else {
                            self.getCurrentUserPrivilegeSet(node, function(err, privSet) {
                                if (err)
                                    return next(err);

                                if (privSet) {
                                    delete requestedProperties[prop];
                                    returnedProperties["200"]["{DAV:}current-user-privilege-set"] = jsDAVACL_Property_CurrentUserPrivilegeSet.new(privSet);
                                }
                                next();
                            });
                        }
                    });
                },
                "{DAV:}acl": function(prop, next) {
                    self.checkPrivileges(uri, "{DAV:}read-acl", self.R_PARENT, function(err, hasPriv) {
                        if (!hasPriv) {
                            delete requestedProperties[prop];
                            returnedProperties["403"]["{DAV:}acl"] = null;
                            next();
                        }
                        else {
                            self.getACL(node, function(err, acl) {
                                if (err)
                                    return next(err);

                                if (acl) {
                                    delete requestedProperties[prop];
                                    returnedProperties["200"]["{DAV:}acl"] = jsDAVACL_Property_Acl.new(acl);
                                }
                                next();
                            });
                        }
                    });
                },
                "{DAV:}acl-restrictions": function(prop, next) {
                    delete requestedProperties[prop];
                    returnedProperties["200"]["{DAV:}acl-restrictions"] = jsDAVACL_Property_AclRestrictions.new();
                    next();
                },
                "{DAV:}owner": function(prop, next) {
                    delete requestedProperties[prop];
                    returnedProperties["200"]["{DAV:}owner"] = jsDAV_Property_Href.new(node.getOwner() + "/");
                    next();
                }
            };

            var propsToCheck = ["{DAV:}principal-collection-set", "{DAV:}current-user-principal",
                "{DAV:}supported-privilege-set", "{DAV:}current-user-privilege-set",
                "{DAV:}acl", "{DAV:}acl-restrictions"];
            // Adding principal properties
            if (node.hasFeature(jsDAVACL_iPrincipal)) {
                propsToCheck.push("{DAV:}alternate-uri-set", "{DAV:}principal-url",
                    "{DAV:}group-member-set", "{DAV:}group-membership", "{DAV:}displayname");
            }
            // Adding ACL properties
            if (node.hasFeature(jsDAVACL_iACL))
                propsToCheck.push("{DAV:}owner");

            // property must be requested to be processed...
            propsToCheck = propsToCheck.filter(function(prop) {
                return !!requestedProperties[prop];
            });

            Async.list(propsToCheck)
                .delay(0, 10)
                .each(function(prop, next) {
                    if (propHandlers[prop])
                        propHandlers[prop](prop, next);
                    else
                        next();
                })
                .end(e.next.bind(e));
        });
    },

    /**
     * This method intercepts PROPPATCH methods and make sure the
     * group-member-set is updated correctly.
     *
     * @param {Array} propertyDelta
     * @param {Array} result
     * @param DAV\INode node
     * @return bool
     */
    updateProperties: function(e, propertyDelta, result, node) {
        if (!propertyDelta["{DAV:}group-member-set"])
            return;

        var self = this;
        var memberSet;
        if (!propertyDelta["{DAV:}group-member-set"]) {
            memberSet = [];
        }
        else if (propertyDelta["{DAV:}group-member-set"].hasFeature(jsDAV_Property_HrefList)) {
            memberSet = propertyDelta["{DAV:}group-member-set"].getHrefs().map(function(uri) {
                return self.handler.calculateUri(uri);
            });
        }
        else
            return e.next(new Exc.Exception("The group-member-set property MUST be an instance of jsDAV_Property_HrefList or null"));

        if (!(node.hasFeature(jsDAVACL_iPrincipal))) {
            result["403"]["{DAV:}group-member-set"] = null;
            delete propertyDelta["{DAV:}group-member-set"];

            // e.stop() will stop the updateProperties process
            return e.stop();
        }

        node.setGroupMemberSet(memberSet, function(err) {
            if (err)
                return e.next(err);

            // We must also clear our cache, just in case
            self.principalMembershipCache = {};

            result["200"]["{DAV:}group-member-set"] = null;
            delete propertyDelta["{DAV:}group-member-set"];
            e.next();
        });
    },

    /**
     * This method handles HTTP REPORT requests
     *
     * @param {String} reportName
     * @param \DOMNode dom
     * @return bool
     */
    report: function(e, reportName, dom) {
        switch(reportName) {
            case "{DAV:}principal-property-search" :
                this.principalPropertySearchReport(e, dom);
                break;
            case "{DAV:}principal-search-property-set" :
                this.principalSearchPropertySetReport(e, dom);
                break;
            case "{DAV:}expand-property" :
                this.expandPropertyReport(e, dom);
                break;
            default:
                e.next();
                break;
        }
    },

    /**
     * This event is triggered for any HTTP method that is not known by the
     * webserver.
     *
     * @param {String} method
     * @param {String} uri
     * @return bool
     */
    unknownMethod: function(e, method, uri) {
        if (method !== "ACL")
            return e.next();

        this.httpACL(e, uri);
    },

    /**
     * This method is responsible for handling the 'ACL' event.
     *
     * @param {String} uri
     * @return void
     */
    httpACL: function(e, uri) {
        var self = this;
        this.handler.getRequestBody("utf8", null, false, function(err, body) {
            if (err)
                return e.next(err);

            Xml.loadDOMDocument(body, self.handler.server.options.parser, function(err, dom) {
                if (err)
                    return e.next(err);

                var newAcl = jsDAVACL_Property_Acl.unserialize(dom.firstChild).getPrivileges();

                // Normalizing urls
                newAcl.forEach(function(newAce) {
                    newAce.principal = self.handler.calculateUri(newAce.principal);
                });

                self.handler.getNodeForPath(uri, function(err, node) {
                    if (err)
                        return e.next(err);

                    if (!node.hasFeature(jsDAVACL_iACL))
                        return e.next(new Exc.Exception_MethodNotAllowed("This node does not support the ACL method"));

                    self.getACL(node, function(err, oldAcl) {
                        if (err)
                            return e.next(err);

                        self.getFlatPrivilegeSet(node, function(err, supportedPrivileges) {
                            if (err)
                                return e.next(err);

                            // Checking if protected principals from the existing principal set are
                            // not overwritten.
                            var i, l, j, l2, oldAce, newAce, found;
                            for (i = 0, l = oldAcl.length; i < l; ++i) {
                                oldAce = oldAcl[i];
                                if (!oldAce.protected)
                                    continue;

                                found = false;
                                for (j = 0, l2 = newAcl.length; j < l2; ++j) {
                                    newAce = newAcl[j];
                                    if (newAce.privilege === oldAce.privilege &&
                                      newAce.principal === oldAce.principal &&
                                      newAce.protected) {
                                        found = true;
                                    }
                                }

                                if (!found)
                                    return e.next(new Exc.AceConflict("This resource contained a protected {DAV:}ace, but this privilege did not occur in the ACL request"));
                            }

                            Async.list(newAcl)
                                .each(function(newAce, nextAce) {
                                    // Do we recognize the privilege
                                    if (!supportedPrivileges[newAce.privilege]) {
                                        return nextAce(new Exc.NotSupportedPrivilege("The privilege you specified (" +
                                            newAce.privilege + ") is not recognized by this server"));
                                    }

                                    if (supportedPrivileges[newAce.privilege].abstract) {
                                        return nextAce(new Exc.NoAbstract("The privilege you specified (" +
                                            newAce.privilege + ") is an abstract privilege"));
                                    }

                                    // Looking up the principal
                                    self.handler.getNodeForPath(newAce.principal, function(err, principal) {
                                        if (err) {
                                            if (err instanceof Exc.NotFound) {
                                                return nextAce(new Exc.NotRecognizedPrincipal("The specified principal (" +
                                                    newAce.principal + ") does not exist"));
                                            }
                                            else
                                                return nextAce(err);
                                        }

                                        if (!principal.hasFeature(jsDAVACL_iPrincipal)) {
                                            return nextAce(new Exc.NotRecognizedPrincipal("The specified uri (" +
                                                newAce.principal + ") is not a principal"));
                                        }

                                        nextAce();
                                    });
                                })
                                .end(function(err) {
                                    if (err)
                                        return e.next(err);

                                    node.setACL(newAcl, function(err) {
                                        if (err)
                                            return e.next(err);
                                        e.stop();
                                    });
                                });
                        });
                    });
                });
            });
        });
    },

    /**
     * The expand-property report is defined in RFC3253 section 3-8.
     *
     * This report is very similar to a standard PROPFIND. The difference is
     * that it has the additional ability to look at properties containing a
     * {DAV:}href element, follow that property and grab additional elements
     * there.
     *
     * Other rfc's, such as ACL rely on this report, so it made sense to put
     * it in this plugin.
     *
     * @param DOMElement dom
     * @return void
     */
    expandPropertyReport: function(e, dom) {
        var requestedProperties = this.parseExpandPropertyReportRequest(dom.firstChild.firstChild);
        var depth = this.handler.getHTTPDepth(0);
        var requestUri = this.handler.getRequestUri();
        var self = this;

        this.expandProperties(requestUri, requestedProperties, depth, function(err, result) {
            if (err)
                return e.next(err);

            e.stop();

            var namespace, prefix, entry, href, response;
            var xml = '<?xml version="1.0" encoding="utf-8"?><d:multistatus';

            // Adding in default namespaces
            for (namespace in Xml.xmlNamespaces) {
                prefix = Xml.xmlNamespaces[namespace];
                xml += ' xmlns:' + prefix + '="' + namespace + '"';
            }

            xml += ">";

            result.forEach(function(response) {
                xml = response.serialize(self.handler, xml);
            });

            self.handler.httpResponse.writeHead(207, {"content-type": "application/xml; charset=utf-8"});
            self.handler.httpResponse.end(xml + "</d:multistatus>");
        });
    },

    /**
     * This method is used by expandPropertyReport to parse
     * out the entire HTTP request.
     *
     * @param DOMElement node
     * @return array
     */
    parseExpandPropertyReportRequest: function(node) {
        var requestedProperties = {};
        var children, namespace, propName;
        do {
            if (Xml.toClarkNotation(node) !== "{DAV:}property")
                continue;

            if (node.firstChild)
                children = this.parseExpandPropertyReportRequest(node.firstChild);
            else
                children = [];

            namespace = node.getAttribute("namespace");
            if (!namespace)
                namespace = "DAV:";

            propName = "{" + namespace + "}" + node.getAttribute("name");
            requestedProperties[propName] = children;
        }
        while (node = node.nextSibling)

        return requestedProperties;
    },

    /**
     * This method expands all the properties and returns
     * a list with property values
     *
     * @param {Array} path
     * @param {Array} requestedProperties the list of required properties
     * @param {Number} depth
     * @return array
     */
    expandProperties: function(path, requestedProperties, depth, callback) {
        var self = this;
        this.handler.getPropertiesForPath(path, Object.keys(requestedProperties), depth, function(err, foundProperties) {
            if (err)
                return callback(err);

            var result = [];

            Async.list(Object.keys(foundProperties))
                .each(function(prop, nextProp) {
                    var node = foundProperties[prop];

                    Async.list(Object.keys(requestedProperties))
                        .each(function(propertyName, nextReqProp) {
                            var childRequestedProperties = requestedProperties[propertyName];

                            // We're only traversing if sub-properties were requested
                            if (Object.keys(childRequestedProperties).length === 0)
                                return nextReqProp();

                            // We only have to do the expansion if the property was found
                            // and it contains an href element.
                            if (!node["200"][propertyName])
                                return nextReqProp();

                            var hrefs;
                            if (node["200"][propertyName].hasFeature(jsDAV_iHref))
                                hrefs = [node["200"][propertyName].getHref()];
                            else if (node["200"][propertyName].hasFeature(jsDAV_Property_HrefList))
                                hrefs = node["200"][propertyName].getHrefs();

                            var childProps = [];
                            Async.list(hrefs)
                                .each(function(href, nextHref) {
                                    self.expandProperties(href, childRequestedProperties, 0, function(err, hrefProps) {
                                        if (err)
                                            return nextHref(err);
                                        childProps = childProps.concat(hrefProps);
                                        nextHref();
                                    })
                                })
                                .end(function(err) {
                                    if (err)
                                        return nextReqProp(err);
                                    node["200"][propertyName] = jsDAV_Property_ResponseList.new(childProps);
                                    nextReqProp();
                                })
                        })
                        .end(function(err) {
                            if (err)
                                return nextProp(err);
                            result.push(jsDAV_Property_Response.new(path, node));
                            nextProp();
                        });
                })
                .end(function(err) {
                    callback(err, result);
                });
        });
    },

    /**
     * principalSearchPropertySetReport
     *
     * This method responsible for handing the
     * {DAV:}principal-search-property-set report. This report returns a list
     * of properties the client may search on, using the
     * {DAV:}principal-property-search report.
     *
     * @param DOMDocument dom
     * @return void
     */
    principalSearchPropertySetReport: function(e, dom) {
        var httpDepth = this.handler.getHTTPDepth(0);
        if (httpDepth !== 0)
            return e.next(new Exc.BadRequest("This report is only defined when Depth: 0"));

        if (dom.firstChild && dom.firstChild.childNodes.length)
            return e.next(new Exc.BadRequest("The principal-search-property-set report element is not allowed to have child elements"));

        e.stop();

        var namespace, prefix, entry, href, response;
        var xml = '<?xml version="1.0" encoding="utf-8"?><d:principal-search-property-set';

        // Adding in default namespaces
        for (namespace in Xml.xmlNamespaces) {
            prefix = Xml.xmlNamespaces[namespace];
            xml += ' xmlns:' + prefix + '="' + namespace + '"';
        }

        xml += ">";

        var nsList = Xml.xmlNamespaces;
        var self = this;
        var aXml = [xml];

        Object.keys(this.principalSearchPropertySet).forEach(function(propertyName) {
            var description = self.principalSearchPropertySet[propertyName];
            var propName = propertyName.match(/^\{([^\}]*)\}(.*)/);
            aXml.push("<d:principal-search-property><d:prop><" + nsList[propName[1]] +
                ":" + propName[2] + "/></d:prop><d:description xml:lang=\"en\">" +
                Xml.escapeXml(description) + "</d:description></d:principal-search-property>");
        });

        this.handler.httpResponse.writeHead(200, {"content-type": "application/xml; charset=utf-8"});
        this.handler.httpResponse.end(aXml.join(""));
    },

    /**
     * principalPropertySearchReport
     *
     * This method is responsible for handing the
     * {DAV:}principal-property-search report. This report can be used for
     * clients to search for groups of principals, based on the value of one
     * or more properties.
     *
     * @param DOMDocument dom
     * @return void
     */
    principalPropertySearchReport: function(e, dom) {
        var res;
        try {
            res = this.parsePrincipalPropertySearchReportRequest(dom);
        }
        catch(ex) {
            return e.next(ex);
        }
        var searchProperties = res[0];
        var requestedProperties = res[1];
        var applyToPrincipalCollectionSet = res[2];

        var uri = null;
        if (!applyToPrincipalCollectionSet)
            uri = this.handler.getRequestUri();

        var self = this;
        this.principalSearch(searchProperties, requestedProperties, uri, function(err, result) {
            if (err)
                return e.next(err);

            e.stop();

            var prefer = self.handler.getHTTPPRefer();
            self.handler.httpResponse.writeHead(207, {
                "content-type": "application/xml; charset=utf-8",
                "vary": "Brief,Prefer"
            });
            self.handler.httpResponse.end(self.handler.generateMultiStatus(result, prefer["return-minimal"]));
        });
    },

    /**
     * parsePrincipalPropertySearchReportRequest
     *
     * This method parses the request body from a
     * {DAV:}principal-property-search report.
     *
     * This method returns an array with two elements:
     *  1. an array with properties to search on, and their values
     *  2. a list of propertyvalues that should be returned for the request.
     *
     * @param DOMDocument dom
     * @return array
     */
    parsePrincipalPropertySearchReportRequest: function(dom) {
        var httpDepth = this.handler.getHTTPDepth(0);
        if (httpDepth !== 0)
            throw new Exc.BadRequest("This report is only defined when Depth: 0");

        var searchProperties = {};
        var applyToPrincipalCollectionSet = false;

        // Parsing the search request
        var searchNode, propertyName, propertyValue, childNode, i, l, j, l2;
        for (i = 0, l = dom.firstChild.childNodes.length; i < l; ++i) {
            searchNode = dom.firstChild.childNodes[i];
            if (Xml.toClarkNotation(searchNode) == "{DAV:}apply-to-principal-collection-set")
                applyToPrincipalCollectionSet = true;

            if (Xml.toClarkNotation(searchNode) != "{DAV:}property-search")
                continue;

            propertyName = null;
            propertyValue = null;

            for (j = 0, l2 = searchNode.childNodes.length; j < l2; ++j) {
                childNode = searchNode.childNodes[j];
                switch (Xml.toClarkNotation(childNode)) {
                    case "{DAV:}prop" :
                        propertyName = Object.keys(Xml.parseProperties(searchNode))[0];
                        break;
                    case "{DAV:}match" :
                        propertyValue = childNode.textContent;
                        break;

                }
            }

            if (!propertyName || !propertyValue)
                throw new Exc.BadRequest("Invalid search request. propertyname: " + propertyName + ". propertvvalue: " + propertyValue);

            searchProperties[propertyName] = propertyValue;
        }

        return [searchProperties, Object.keys(Xml.parseProperties(dom.firstChild)), applyToPrincipalCollectionSet];
    }
});
