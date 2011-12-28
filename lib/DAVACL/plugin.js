/*
 * @package jsDAV
 * @subpackage DAVACL
 * @copyright Copyright(c) 2011 Tri Tech Computers Ltd. <info AT tri-tech DOT com>
 * @author James Emerton <james AT tri-tech DOT com>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var Async = require("./../../support/async.js");
var Exc = require("./../DAV/exceptions");
var Util = require("./../DAV/util");

var ACL_Exc = require("./exceptions");
var jsDAV = require("./../jsdav");
var jsDAV_ServerPlugin = require("./../DAV/plugin").jsDAV_ServerPlugin;

var jsDAV_Property_HrefList = require("./../DAV/property/hreflist").jsDAV_Property_HrefList;
var jsDAV_Property_Principal = require("./property/principal").jsDAV_Property_Principal;
var jsDAV_Property_Response = require("./../DAV/property/response").jsDAV_Property_Response;
var jsDAV_DAVACL_Property_CurrentUserPrivilegeSet =
        require('./property/currentUserPrivilegeSet').jsDAV_DAVACL_Property_CurrentUserPrivilegeSet;


function jsDAV_DAVACL_Plugin(handler) {
    this.handler = handler;

    handler.addEventListener("beforeGetProperties", this.beforeGetProperties.bind(this));
    handler.addEventListener("report", this.report.bind(this));

    handler.resourceTypeMapping[jsDAV.__IPRINCIPAL__] = "{DAV:}principal";
}

(function() {
    /**
     * List of urls containing principal collections.
     * Modify this if your principals are located elsewhere.
     *
     * @var array
     */
    this.principalCollectionSet = [
        'principals'
    ];
    
    /**
     * By default ACL is only enforced for nodes that have ACL support (the
     * ones that implement Sabre_DAVACL_IACL). For any other node, access is
     * always granted.
     *
     * To override this behaviour you can turn this setting off. This is useful
     * if you plan to fully support ACL in the entire tree.
     *
     * @var bool
     */
    this.allowAccessToNodesWithoutACL = true;

    /**
     * This string is prepended to the username of the currently logged in
     * user. This allows the plugin to determine the principal path based on
     * the username.
     *
     * @var string
     */
    this.defaultUsernamePath = 'principals';
    
    /**
     * This list of properties are the properties a client can search on using
     * the {DAV:}principal-property-search report.
     *
     * The keys are the property names, values are descriptions.
     *
     * @var array
     */
    this.principalSearchPropertySet = {
        '{DAV:}displayname': 'Display name',
        '{http://ajax.org/2005/aml}email-address': 'Email address'
    };

    /**
     * Returns a list of features added by this plugin.
     *
     * This list is used in the response of a HTTP OPTIONS request.
     *
     * @return array
     */
    this.getFeatures = function() {
        return ['access-control'];
    }

    /**
     * Returns a list of available methods for a given url
     *
     * @param string $uri
     * @return array
     */
    this.getMethods = function() {
        // Currently disabled because NodeJS is unable to handle the ACL method
        //return ['ACL'];
        return [];
    }

    /**
     * Returns a plugin name.
     *
     * Using this name other plugins will be able to access other plugins
     * using Sabre_DAV_Server::getPlugin
     *
     * @return string
     */
    this.getPluginName = function() {
        return 'acl';
    }

    /**
     * Returns a list of reports this plugin supports.
     *
     * This will be used in the {DAV:}supported-report-set property.
     * Note that you still need to subscribe to the 'report' event to actually
     * implement them
     *
     * @param string $uri
     * @return array
     */
    this.getSupportedReportSet = function(uri, callback) {
        callback(null, [
            '{DAV:}expand-property',
            '{DAV:}principal-property-search',
            '{DAV:}principal-search-property-set',
        ]);
    }

    /**
     * Checks if the current user has the specified privilege(s).
     *
     * You can specify a single privilege, or a list of privileges.
     * This method will throw an exception if the privilege is not available
     * and return true otherwise.
     *
     * @param string $uri
     * @param array|string $privileges
     * @param int $recursion
     * @param bool $throwExceptions if set to false, this method won't through exceptions.
     * @throws Sabre_DAVACL_Exception_NeedPrivileges
     * @return bool
     */
    this.checkPrivileges = function(path, privileges, recursion, cbcheckprivs) {
        var self = this;
        recursion = recursion || self.R_PARENT;

        if(!Array.isArray(privileges))
            privileges = [privileges];

        self.getCurrentUserPrivilegeSet(path, function(err, acl) {
            if(acl === null) {
                if(self.allowAccessToNodesWithoutACL)
                    return cbcheckprivs(null, true);
                else
                    return cbcheckprivs(new ACL_Exc.jsDAV_DAVACL_Exception_NeedPrivileges(path, privileges), false);
            }

            var failed = [];
            for(var i=0; i<privileges.length; ++i) {
                if(acl.indexOf(privileges[i]) === -1)
                    failed.push(privileges[i]);
            }

            if(failed.length)
                cbcheckprivs(new ACL_Exc.jsDAV_DAVACL_Exception_NeedPrivileges(path, failed), false);
            else
                cbcheckprivs(null, true);
        });

    }
    
    /**
     * Returns the standard users' principal.
     *
     * This is one authorative principal url for the current user.
     * This method will return null if the user wasn't logged in.
     *
     * @return string|null
     */
    this.getCurrentUserPrincipal = function() {
        var authPlugin = this.handler.plugins['auth'];
        if(authPlugin === undefined) return null;

        var user = authPlugin.getCurrentUser();
        return (user ? this.defaultUsernamePath+'/'+user : null);
    }

    /**
     * Returns a list of principals that's associated to the current
     * user, either directly or through group membership.
     *
     * @return array
     */
    this.getCurrentUserPrincipals = function(cbgetprincipals) {
        var self = this;
        var currentUser = self.getCurrentUserPrincipal();

        if(currentUser === null)
            return [];

        var check = [currentUser];
        var principals = [currentUser];

        check_principal();

        function check_principal() {
            if(!check.length)
                return cbgetprincipals(null, principals);

            var principal = check.shift();

            self.handler.getNodeForPath(principal, function(err, node) {
                if(err) return cbgetprincipals(err);

                if(node.hasFeature(jsDAV.__IPRINCIPAL__)) {
                    node.getGroupMembership(function(err, groups) {
                        if(err) return cbgetprincipals(err);

                        for(var i=0; i<groups.length; ++i) {
                            if(principals.indexOf(groups[i]) == -1) {
                                check.push(groups[i]);
                                principals.push(groups[i]);
                            }
                            
                        }

                        check_principal();
                    });
                }
            });
        }
    }
    
    /**
     * Returns the supported privilege structure for this ACL plugin.
     *
     * See RFC3744 for more details. Currently we default on a simple,
     * standard structure.
     *
     * You can either get the list of privileges by a uri (path) or by
     * specifying a Node.
     *
     * @param string|Sabre_DAV_INode $node
     * @return array
     */
    this.getSupportedPrivilegeSet = function(node) {
        if(node.hasFeature(jsDAV.__IACL__)) {
            var result = node.getSupportedPrivilegeSet();

            if(result)
                return result;
        }

        return jsDAV_DAVACL_Plugin.getDefaultSupportedPrivilegeSet();
    }

    /**
     * Returns a fairly standard set of privileges, which may be useful for
     * other systems to use as a basis.
     *
     * @return array
     */
    jsDAV_DAVACL_Plugin.getDefaultSupportedPrivilegeSet = function() {
        // NB: This return value may be modified in place -- do not return
        // any sort of mutable cached object unless it is deep-copied first
        return {
            'privilege': '{DAV:}all',
            'abstract': true,
            'aggregates': [
                {
                    'privilege': '{DAV:}read',
                    'aggregates': [
                        {
                            'privilege': '{DAV:}read-acl',
                            'abstract': true
                        },
                        {
                            'privilege': '{DAV:}read-current-user-privilege-set',
                            'abstract': true
                        }
                    ]
                }, // {DAV:}read
                {
                    'privilege': '{DAV:}write',
                    'aggregates': [
                        {
                            'privilege': '{DAV:}write-acl',
                            'abstract': true
                        },
                        {
                            'privilege': '{DAV:}write-properties',
                            'abstract': true
                        },
                        {
                            'privilege': '{DAV:}write-content',
                            'abstract': true
                        },
                        {
                            'privilege': '{DAV:}bind',
                            'abstract': true
                        },
                        {
                            'privilege': '{DAV:}unbind',
                            'abstract': true
                        },
                        {
                            'privilege': '{DAV:}unlock',
                            'abstract': true
                        }
                    ]
                } // {DAV:}write
            ]
        }; // {DAV:}all
    }
    
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
     * @param string|Sabre_DAV_INode $node
     * @return array
     */
    this.getFlatPrivilegeSet = function(node) {
        var privs = this.getSupportedPrivilegeSet(node);

        var flat = {};
        traverse(privs, null);

        function traverse(priv, concrete) {
            var myPriv = {
                'privilege': priv.privilege,
                'abstract': priv.abstract || false,
                'aggregates': [],
                'concrete': priv.abstract ? concrete : priv.privilege
            };

            if(priv.aggregates) {
                for(var i=0; i<priv.aggregates.length; ++i)
                    myPriv.aggregates.push(priv.aggregates[i].privilege);
            }

            flat[priv.privilege] = myPriv;

            if(priv.aggregates) {
                for(var i=0; i<priv.aggregates.length; ++i)
                    traverse(priv.aggregates[i], myPriv.concrete);
            }
        }

        return flat;

    }

    /**
     * Returns the full ACL list.
     *
     * null will be returned if the node doesn't support ACLs.
     *
     * @param string|Sabre_DAV_INode $node
     * @return array
     */
    this.getACL = function(node) {
        if(node.hasFeature(jsDAV.__IACL__))
            return node.getACL();

        return null;
    }

    /**
     * Returns a list of privileges the current user has
     * on a particular node.
     *
     * Either a uri or a Sabre_DAV_INode may be passed.
     *
     * null will be returned if the node doesn't support ACLs.
     *
     * @param string|Sabre_DAV_INode $node
     * @return array
     */
    this.getCurrentUserPrivilegeSet = function(node, cbgetprivset) {
        var self = this;
        if (typeof node === "string")
            self.handler.getNodeForPath(node, get_privilege_set);
        else
            get_privilege_set(null, node);

        function get_privilege_set(err, node) {
            var acl = self.getACL(node);

            if(acl === null)
                return cbgetprivset(null, null);

            self.getCurrentUserPrincipals(function(err, principals) {
                if(err) return cbgetprivset(err);

                var collected = [];

                Async.list(acl)
                    .each(function(ace, cbnext) {
                        switch(ace.principal) {
                            case '{DAV:}owner':
                                var owner = node.getOwner();
                                if(owner && principals.indexOf(owner) != -1) 
                                    collected.push(ace);
                                return cbnext();

                            // 'all' matches for every user
                            case '{DAV:}all':

                            // 'authenticated' matched for every user that's logged in.
                            // Since it's not possible to use ACL while not being logged
                            // in, this is also always true.
                            case '{DAV:}authenticated':
                                collected.push(ace);
                                return cbnext();
                                
                            // 'unauthenticated' can never occur either, so we simply
                            // ignore these.
                            case '{DAV:}unauthenticated':
                                return cbnext();

                            default:
                                if(principals.indexOf(ace.principal) != -1)
                                    collected.push(ace);
                                return cbnext();
                        }
                    })
                    .end(function(err) {
                        if(err) return cbgetprivset(err);

                        // Now we deduct all aggregated privileges.
                        var flat = self.getFlatPrivilegeSet(node);
                        var collected2 = [];
                        Async.list(collected)
                            .each(function(priv, cbnext) {
                                collected2.push(priv.privilege);
                                var aggregates = flat[priv.privilege].aggregates;
                                for(var i=0; i<aggregates.length; ++i) {
                                    if(collected2.indexOf(aggregates[i]) == -1)
                                        collected2.push(aggregates[i]);
                                }
                                cbnext();
                            })
                            .end(function(err) {
                                cbgetprivset(err, collected2);
                            });
                    });
            });
        }

    }
    
    this.beforeGetProperties = function(e, path, node, propertyNames, newProperties) {
        var self = this;
        Async.list(propertyNames)
            .each(function(prop, cbnextprop) {
                switch(prop) {
                    case "{DAV:}current-user-principal":
                        var user = self.getCurrentUserPrincipal();
                        if(user) {
                            newProperties["200"][prop] = new jsDAV_Property_Principal(
                                jsDAV_Property_Principal.HREF, user);
                        }
                        else {
                            newProperties["200"][prop] = new jsDAV_Property_Principal(
                                jsDAV_Property_Principal.UNAUTHENTICATED);
                        }
                        return cbnextprop();

                    case "{DAV:}principal-collection-set":
                        var principal_urls = [];
                        for(var i=0; i<self.principalCollectionSet.length; ++i)
                            principal_urls.push(self.principalCollectionSet[i]+"/");
                        newProperties["200"][prop] = new jsDAV_Property_HrefList(principal_urls);
                        return cbnextprop();

                    case "{DAV:}current-user-privilege-set":
                        return self.checkPrivileges(path, '{DAV:}read-current-user-privilege-set',
                                self.R_PARENT, function(err, ok) {
                            if(!ok) {
                                newProperties["403"] = newProperties["403"] || {};
                                newProperties["403"]['{DAV:}current-user-privilege-set'] = null;
                                return cbnextprop();
                            }
                            else {
                                self.getCurrentUserPrivilegeSet(node, function(err, priv) {
                                    if(err) return cbnextprop(err);
                                    newProperties["200"]['{DAV:}current-user-privilege-set']
                                        = new jsDAV_DAVACL_Property_CurrentUserPrivilegeSet(priv);
                                    cbnextprop();
                                });
                                }
                        });
                }

                if(node.hasFeature(jsDAV.__IPRINCIPAL__)) {
                    switch(prop) {
                        case "{DAV:}displayname":
                            newProperties["200"][prop] = node.getDisplayName();
                            return cbnextprop();

                        case "{DAV:}group-membership":
                            node.getGroupMembership(function(err, groups) {
                                if(err) return cbnextprop(err);

                                newProperties["200"][prop] = new jsDAV_Property_HrefList(groups);
                                cbnextprop();
                            });
                            return;
                    }
                }

                cbnextprop();
            })
            .end(e.next.bind(e));
    }

    /**
     * This method handels HTTP REPORT requests
     *
     * @param string $reportName
     * @param DOMNode $dom
     * @return bool
     */
    this.report = function(e, reportName, dom) {
        switch(reportName) {
            case '{DAV:}principal-property-search':
                return this.principalPropertySearchReport(e, dom);
            case '{DAV:}principal-search-property-set':
                return this.principalSearchPropertySetReport(e, dom);
            case '{DAV:}expand-property':
                return this.expandPropertyReport(e, dom);
        }

        e.next();
    }

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
     * @param DOMElement $dom
     * @return void
     */
    this.expandPropertyReport = function(e, dom) {
        var self = this;
        var requestedProperties = this.parseExpandPropertyReportRequest(dom);

        var depth = this.handler.getHTTPDepth(0);
        var requestUri = this.handler.getRequestUri();

        var result = this.expandProperties(requestUri, requestedProperties, depth, function(err, result) {
            if(err) e.next(err);

            //self.handler.generateMultiStatus(result);
            var xml = '<?xml version="1.0" encoding="utf-8"?><d:multistatus';

            // Adding in default namespaces
            for (var namespace in self.handler.xmlNamespaces) {
                var prefix = self.handler.xmlNamespaces[namespace];
                xml += ' xmlns:' + prefix + '="' + namespace + '"';
            }

            xml += ">";

            for(var i=0; i<result.length; ++i)
                xml = result[i].serialize(self.handler, xml);

            xml += "</d:multistatus>";

            self.handler.httpResponse.writeHead(207, {'Content-Type': 'application/xml; charset=utf-8'});
            self.handler.httpResponse.end(xml);

            e.stop();
        });
    }

    /**
     * This method is used by expandPropertyReport to parse
     * out the entire HTTP request.
     *
     * @param DOMElement $node
     * @return array
     */
    this.parseExpandPropertyReportRequest = function(node) {
        var requestedProperties = { };
        var childNodes = node.childNodes;

        for(var i=0; i<childNodes.length; ++i) {
            node = childNodes[i];
            if (Util.toClarkNotation(node)!=='{DAV:}property') continue;

            var children = this.parseExpandPropertyReportRequest(node);
            var namespace = node.getAttribute('namespace') || 'DAV:';
            var propName = '{'+namespace+'}'+node.getAttribute('name');
            requestedProperties[propName] = children;
        }

        return requestedProperties;
    }

    /**
     * This method expands all the properties and returns
     * a list with property values
     *
     * @param array $path
     * @param array $requestedProperties the list of required properties
     * @param int $depth
     * @return array
     */
    this.expandProperties = function(path, requestedProperties, depth, cbexpandprops) {
        var self = this;
        self.handler.getPropertiesForPath(path, Object.keys(requestedProperties), depth, function(err, props) {
            if(err) return cbexpandprops(err);

            var result = [];

            Async.keys(props)
                .each(function(path, cbnextpath) {
                    var nodeProps = props[path];

                    Async.keys(requestedProperties)
                        .each(function(propName, cbnextprop) {
                            var childRequestedProperties = requestedProperties[propName];

                            // We're only traversing if sub-properties were requested
                            if(!childRequestedProperties.length) return cbnextprop();

                            var property = nodeProps["200"][propName];

                            // We only have to do the expansion if the property was found
                            // and it contains an href element.
                            if(property === undefined) return cbnextprop();

                            var hrefs = [];
                            if (property.hasFeature(jsDAV.__PROP_IHREF__))
                                hrefs = [property.getHref()];
                            else if (property instanceof jsDAV_Property_HrefList)
                                hrefs = property.getHrefs();

                            var childProps = [];
                            Async.list(hrefs)
                                .each(function(href, cbnexthref) {
                                    self.expandProperties(href, childRequestedProperties, 0, function(err, cprops) {
                                        childProps = childProps.concat(cprops);
                                        cbnexthref();
                                    });
                                })
                                .end(function(err) {
                                    if(err) return cbexpandprops(err);

                                    nodeProps["200"][propName] = new jsDAV_Property_ResponseList(childProps);
                                    cbnextprop();
                                });


                        })
                        .end(function(err) {
                            if(err) return cbexpandprops(err);

                            result.push(new jsDAV_Property_Response(path, nodeProps));
                            cbnextpath();
                        });
                })
                .end(function(err) {
                    cbexpandprops(err, result);
                });
        });

    }
    
    /**
     * principalSearchPropertySetReport
     *
     * This method responsible for handing the
     * {DAV:}principal-search-property-set report. This report returns a list
     * of properties the client may search on, using the
     * {DAV:}principal-property-search report.
     *
     * @param DOMDocument $dom
     * @return void
     */
    this.principalSearchPropertySetReport = function(e, dom) {
        if (this.handler.getHTTPDepth(0) !== 0)
            return e.next(new Exc.jsDAV_Exception_BadRequest('This report is only defined when Depth: 0'));

        //if (dom.firstChild.childNodes) {
        //    return e.next(new Exc.jsDAV_Exception_BadRequest(
        //        'The principal-search-property-set report element is not allowed to have child elements'));
        //}
        //
        
        var newDom = '<?xml version="1.0" encoding="utf-8"?><d:principal-search-property-set';
        for(var namespace in this.handler.xmlNamespaces)
            newDom += ' xmlns:'+this.handler.xmlNamespaces[namespace]+'="'+namespace+'"';

        newDom += '>';

        for(var propName in this.principalSearchPropertySet) {
            var description = this.principalSearchPropertySet[propName];

            newDom += "<d:principal-search-property><d:prop>";

            propName = Util.fromClarkNotation(propName);
            
            // TODO: Handle other namespaces...
            var nodeName = this.handler.xmlNamespaces[propName[0]] + ":" + propName[1];
            newDom += "<"+nodeName+'/>';

            // TODO: Hardcoding the language is evil, too...
            newDom += '<d:description xml:lang="en">'+description+"</d:description>";
            newDom += "</d:prop></d:principal-search-property>";
        }

        newDom += "</d:principal-search-property-set>";

        this.handler.httpResponse.writeHead(200, {
            "Content-Type": "application/xml; charset=utf-8",
            "Content-Length": Buffer.byteLength(newDom)
        });
        this.handler.httpResponse.end(newDom);

        e.stop();
    }
    
}).call(jsDAV_DAVACL_Plugin.prototype = new jsDAV_ServerPlugin());

module.exports = jsDAV_DAVACL_Plugin;
