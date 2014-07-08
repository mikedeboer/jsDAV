/*
 * @package jsDAV
 * @subpackage CalDAV
 * @copyright Copyright(c) 2013 Mike de Boer. <info AT mikedeboer DOT nl>
 * @author Romain Foucault <rmfoucault AT gmail DOT com>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var iProperty = require("./../../DAV/property");
var Base = require("./../../shared/base");


var SupportedCalendarComponentSet = module.exports = Base.extend(iProperty, {
   _components: [],

   initialize: function(components) {
      this._components = [].concat(components);
   },

   serialize: function(handler, prop) {
      return prop + this._components.map(function(component){
         return '<cal:comp name="' + component + '" />';
      }).join("");
   },

   unserialize: function() {
      return null;
   }
});
