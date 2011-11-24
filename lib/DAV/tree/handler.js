/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Kevin Smith
 * @author Kevin Smith <@respectTheCode>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV = require("../../jsdav");
var jsDAV_Tree = require("../tree").jsDAV_Tree;
var jsDAV_Handler_Directory = require("../handler/directory").jsDAV_Handler_Directory;
var jsDAV_Handler_File = require("../handler/file").jsDAV_Handler_File;

var Exc = require("../exceptions");
var Path = require('path');

/**
 * jsDAV_Tree_Handler
 *
 * Creates the Handler tree.
 *
 * @param {Object} options
 * @contructor
 */

function jsDAV_Tree_Handler(options) {
    this.options  = options;
	this.eventHandler = options.eventHandler;
}

exports.jsDAV_Tree_Handler = jsDAV_Tree_Handler;

(function() {
    /**
     * Returns a new node for the given path
     *
     * @param string path
     * @return void
     */
    this.getNodeForPath = function(path, cbfstree) {
		var self = this;

        this.eventHandler.isFolder(path, function (err, isFolder) {
			if (err) {
				return cbfstree(err);
			}

			if (isFolder) {
				return cbfstree(null, new jsDAV_Handler_Directory(self.eventHandler, path));
			} else {
				return cbfstree(null, new jsDAV_Handler_File(self.eventHandler, path));
			}
		});
    };

    /**
     * Copies a file or directory.
     *
     * This method must work recursively and delete the destination
     * if it exists
     *
     * @param string source
     * @param string destination
     * @return void
     */
    this.copy = function(source, destination, next) {
        
    };

    /**
     * Moves a file or directory recursively.
     * In case the ide crashed, the nodes cache was cleared and the source's parent will have to be pre-cached
     * and so will have its children using $getParentNodeRecall(), this way we will be able to come back to this method
     * to rename the source effectively.
     * Once the MOVE has been executed, the node need's to be updated in the cache, and if it's a Directory type its
     * children will have to be updated in the cache as well, so the new keys correspond to the new path.
     *
     * If the destination exists, delete it first.
     *
     * @param string source
     * @param string destination
     * @return void
     */
    this.move = function(source, destination, next) {
       
    };

    this.unmount = function() {

    };

}).call(jsDAV_Tree_Handler.prototype = new jsDAV_Tree());

