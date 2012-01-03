/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Kevin Smith
 * @author Kevin Smith <@respectTheCode>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV             = require("./../../jsdav"),
    jsDAV_Handler_Node     = require("./node").jsDAV_Handler_Node,
    jsDAV_Handler_File     = require("./file").jsDAV_Handler_File,
    jsDAV_Directory   = require("./../directory").jsDAV_Directory,
    jsDAV_iCollection = require("./../iCollection").jsDAV_iCollection,
    jsDAV_iQuota      = require("./../iQuota").jsDAV_iQuota,

    Exc               = require("./../exceptions");

function jsDAV_Handler_Directory(eventHandler, path) {
    this.eventHandler = eventHandler;
    this.path = path;
}

exports.jsDAV_Handler_Directory = jsDAV_Handler_Directory;

(function() {
    this.implement(jsDAV_Directory, jsDAV_iCollection, jsDAV_iQuota);

    /**
     * Creates a new file in the directory
     *
     * data is a readable stream resource
     *
     * @param string name Name of the file
     * @param resource data Initial payload
     * @return void
     */
    this.createFile = function(name, data, enc, cbfscreatefile) {
        var newPath = this.path + "/" + name;

        if (data.length === 0) {
            data = new Buffer(0);
        }

		this.eventHandler.putFile(newPath, data, cbfscreatefile);
    };

    /**
     * Creates a new subdirectory
     *
     * @param string name
     * @return void
     */
    this.createDirectory = function(name, cbfscreatedir) {
        var newPath = this.path + "/" + name;

		this.eventHandler.createFolder(newPath, cbfscreatedir);
    };

    /**
     * Returns a specific child node, referenced by its name
     *
     * @param string name
     * @throws Sabre_DAV_Exception_FileNotFound
     * @return Sabre_DAV_INode
     */
    this.getChild = function(name, cbfsgetchild) {
		var self = this;
        var path = this.path + "/" + name;

        this.eventHandler.isFolder(path, function (err, isFolder) {
			if (err) {
				if (typeof(err) == "string") {
					return cbfsgetchild(new Exc.jsDAV_Exception_FileNotFound(err));
				} else {
					return err;
				}
			}

			if (isFolder) {
				return cbfsgetchild(null, new jsDAV_Handler_Directory(self.eventHandler, path));
			} else {
				return cbfsgetchild(null, new jsDAV_Handler_File(self.eventHandler, path));
			}
		});
    };

    /**
     * Returns an array with all the child nodes
     *
     * @return Sabre_DAV_INode[]
     */
    this.getChildren = function(cbfsgetchildren) {
		var self = this;
        var nodes = [];

		this.eventHandler.ls(this.path, function(err, folders, files) {
			if (err) {
				if (typeof(err) == "string") {
					return cbfsgetchildren(new Exc.jsDAV_Exception_FileNotFound(err));
				} else {
					return cbfsgetchildren(err);
				}
			}

			folders.forEach(function (folder) {
				nodes.push(new jsDAV_Handler_Directory(self.eventHandler, self.path + "/" + folder));
			});

			files.forEach(function (file) {
				nodes.push(new jsDAV_Handler_File(self.eventHandler, self.path + "/" + file));
			});

            cbfsgetchildren(null, nodes);
		});
    };

    /**
     * Deletes all files in this directory, and then itself
     *
     * @return void
     */
    this["delete"] = function(cbfsdel) {
        this.eventHandler.deleteFolder(this.path, cbfsdel);
    };

    /**
     * Returns available diskspace information
     *
     * @return array
     */
    this.getQuotaInfo = function(cbfsquota) {
		this.eventHandler.getSpace(this.path, function (err, free, total) {
			cbfsquota(err, [free, total]);
		});
    };
}).call(jsDAV_Handler_Directory.prototype = new jsDAV_Handler_Node());
