/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Kevin Smith
 * @author Kevin Smith <@respectTheCode>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV       = require("./../../jsdav"),
    jsDAV_iNode = require("./../iNode").jsDAV_iNode,

    Fs          = require("fs"),
    Path        = require("path"),
    Util        = require("./../util"),
    Exc         = require("./../exceptions");

function jsDAV_Handler_Node(eventHandler, path) {
    this.eventHandler = eventHandler;
    this.path = path;
}

exports.jsDAV_Handler_Node = jsDAV_Handler_Node;

(function() {
    /**
     * Returns the name of the node
     *
     * @return {string}
     */
    this.getName = function() {
        return Util.splitPath(this.path)[1];
    };

    /**
     * Renames the node
     *
     * @param {string} name The new name
     * @return void
     */
    this.setName = function(name, cbfssetname) {
        var self = this;
        var parentPath = Util.splitPath(this.path)[0];
        var newName = Util.splitPath(name)[1];
        var newPath = parentPath + "/" + newName;

		this.eventHandler.renameFile(this.path, newPath, function (err) {
			if (err) {
				if (typeof(err) == "string") {
					return cbfstree(new Exc.jsDAV_Exception_FileNotFound(err));
				} else {
					return cbfstree(err);
				}
			}

			self.path = newPath;
			cbfssetname();
		});
    };

    /**
     * Returns the last modification time, as a unix timestamp
     *
     * @return {Number}
     */
    this.getLastModified = function(cbfsgetlm) {
		this.eventHandler.getLastModified(this.path, function (err) {
			if (err) {
				if (typeof(err) == "string") {
					return cbfsgetlm(new Exc.jsDAV_Exception_FileNotFound(err));
				} else {
					return cbfsgetlm(err);
				}
			}

			cbfsgetlm();
		});
    };

    /**
     * Returns whether a node exists or not
     *
     * @return {Boolean}
     */
    this.exists = function(cbfsexist) {
		this.eventHandler.exists(this.path, function (err, exists) {
			cbfsexist(exists);
		});
    };
}).call(jsDAV_Handler_Node.prototype = new jsDAV_iNode());
