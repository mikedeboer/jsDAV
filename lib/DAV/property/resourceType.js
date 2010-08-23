var jsDAV          = require("./../../jsdav"),
    jsDAV_Property = require("./../property").jsDAV_Property,
    jsDAV_Server   = require("./../server").jsDAV_Server;

function jsDAV_Property_ResourceType(resourceType) {
    this.resourceType = (resourceType === jsDAV_Server.NODE_FILE)
        ? null
        : (resourceType === jsDAV_Server.NODE_DIRECTORY)
            ? "{DAV:}collection"
            : resourceType;
}

exports.jsDAV_Property_ResourceType = jsDAV_Property_ResourceType;

(function() {
    this.REGBASE = this.REGBASE | jsDAV.__PROP_RESOURCETYPE__;

    /**
     * serialize
     *
     * @param {DOMElement} prop
     * @return {void}
     */
    this.serialize = function(server, prop) {
        var rt = this.resourceType;
        if (rt.constructor != Array)
            rt = [rt];

        var resourceType, propName, prefix,
            i = 0,
            l = rt.length;
        if (l)
            prop += ">";
        for (; i < l; ++i) {
            resourceType = rt[i];
            if (typeof resourceType != "string") continue;
            if (propName = resourceType.match(/^{([^}]*)}(.*)/g)) {
                if (prefix = server.xmlNamespaces[propName[1]])
                    prop += "<" + prefix + ":" + propName[2] + "/>";
                else
                    prop += "<custom:" + propName[2] + " xmlns:custom=\"" + propName[1] + "\"/>";
            }
        }

    }

    /**
     * Returns the value in clark-notation
     *
     * For example '{DAV:}collection'
     *
     * @return {string}
     */
    this.getValue = function() {
        return this.resourceType;
    };
}).call(jsDAV_Property_ResourceType.prototype = new jsDAV.jsDAV_Property());
