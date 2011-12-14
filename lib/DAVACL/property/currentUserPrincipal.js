/*
 * @package jsDAV
 * @subpackage DAVACL
 * @copyright Copyright(c) 2011 Tri Tech Computers Ltd. <info AT tri-tech DOT com>
 * @author James Emerton <james AT tri-tech DOT com>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV_Property = require("./../../DAV/property").jsDAV_Property;
var jsDAV_Property_Href = require("./../../DAV/property/href").jsDAV_Property_Href;


function jsDAV_Property_CurrentUserPrincpal(prefixPath) {
    this.prefixPath = prefixPath;
}

(function() {
    this.serialize = function(handler, lmDom) {
        var currentUser = handler.plugins['auth'].getCurrentUser();
        if(currentUser) {
            var href = new jsDAV_Property_Href(this.prefixPath+"/"+currentUser, true);
            return href.serialize(handler, lmDom);
        }

        return lmDom+'<unauthenticated/>'
    }
}).call(jsDAV_Property_CurrentUserPrincpal.prototype = new jsDAV_Property());

exports.jsDAV_Property_CurrentUserPrincpal = jsDAV_Property_CurrentUserPrincpal;
