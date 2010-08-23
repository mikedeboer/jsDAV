var jsDAV          = require("./../../jsdav"),
    jsDAV_Property = require("./../property").jsDAV_Property,

    Exc            = require("./../exceptions");

/**
 * Creates the property.
 * The 'type' argument must be one of the type constants defined in this class.
 * 'href' is only required for the HREF type.
 * 
 * @param {Number} type
 * @param {String} href
 * @return {void}
 */
function jsDAV_Property_Principal(type, href) {
    this.type = type;

    if (!href)
        throw new Exc.Sabre_DAV_Exception("The href argument must be specified for the HREF principal type.");
    this.href = href;
}

exports.jsDAV_Property_Principal = jsDAV_Property_Principal;

/**
 * To specify a not-logged-in user, use the UNAUTHENTICTED principal
 */
jsDAV_Property_Principal.UNAUTHENTICATED = 1;

/**
 * To specify any principal that is logged in, use AUTHENTICATED
 */
jsDAV_Property_Principal.AUTHENTICATED = 2;

/**
 * Specific princpals can be specified with the HREF
 */
jsDAV_Property_Principal.HREF = 3;

(function() {
    this.REGBASE = this.REGBASE | jsDAV.__PROP_PRINCIPAL__;

    /**
     * Returns the principal type
     *
     * @return {Number}
     */
    this.getType = function() {
        return this.type;
    };

    /**
     * Returns the principal uri.
     *
     * @return {string}
     */
    this.getHref = function() {
        return this.href;
    };

    /**
     * Serializes the property into a DOMElement.
     *
     * @param {jsDAV_Server} server
     * @param {DOMElement}   node
     * @return void
     */
    this.serialize = function(server, node) {
        var prefix = server.xmlNamespaces["DAV:"];
        switch (this.type) {
            case jsDAV_Property_Principal.UNAUTHENTICATED :
                node += "><" + prefix + ":unauthenticated/>";
            break;
            case jsDAV_Property_Principal.AUTHENTICATED :
                node += "><" + prefix + ":authenticated/>";
            break;
            case jsDAV_Property_Principal.HREF :
                node += "><" + prefix + ":href>" + server.getBaseUri()
                     + this.href + "</" + prefix + ":href>"
            break;
        }
    };
}).call(jsDAV_Property_Principal.prototype = new jsDAV.jsDAV_Property());
