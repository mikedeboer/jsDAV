/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_Dropbox_Node = require("./node").jsDAV_Dropbox_Node;
var jsDAV_Dropbox_File = require("./file").jsDAV_Dropbox_File;
var jsDAV_Directory = require("./../directory").jsDAV_Directory;
var jsDAV_iCollection = require("./../iCollection").jsDAV_iCollection;
var jsDAV_iQuota = require("./../iQuota").jsDAV_iQuota;

var Exc = require("./../exceptions");

function jsDAV_Dropbox_Directory(path, client) {
    this.path = path;
    this.client = client;
}

exports.jsDAV_Dropbox_Directory = jsDAV_Dropbox_Directory;

(function() {
    this.implement(jsDAV_Directory, jsDAV_iCollection, jsDAV_iQuota);

    /**
     * Creates a new file in the directory
     *
     * data is a Buffer resource
     *
     * @param {String} name Name of the file
     * @param {Buffer} data Initial payload
     * @param {String} [enc]
     * @param {Function} cbfscreatefile
     * @return void
     */
    this.createFile = function(name, data, enc, cbfscreatefile) {
        var newPath = this.path + "/" + name;
        if (data.length === 0) {
            data = new Buffer(0);
            enc  = "binary";
        }
        var self = this;
        this.client.put(newPath, data, function(status, res) {
            if (self.client.isError(status))
                return cbfscreatefile(res.error);
            cbfscreatefile();
        });
    };

    /**
     * Creates a new subdirectory
     *
     * @param string name
     * @return void
     */
    this.createDirectory = function(name, cbfscreatedir) {
        var self = this;
        var newPath = this.path + "/" + name;
        this.client.mkdir(newPath, function(status, res) {
            if (self.client.isError(status))
                return cbfscreatedir(res.error);
            cbfscreatedir
        });
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
        this.client.metadata(path, function(status, stat) {
            if (self.client.isError(status)) {
                return cbfsgetchild(new Exc.jsDAV_Exception_FileNotFound("File with name "
                    + path + " could not be located"));
            }
            cbfsgetchild(null, stat.is_dir
                ? new jsDAV_Dropbox_Directory(path, self.client)
                : new jsDAV_Dropbox_File(path, self.client)
            );
        });
    };

    /**
     * Returns an array with all the child nodes
     *
     * @return Sabre_DAV_INode[]
     */
    this.getChildren = function(cbfsgetchildren) {
        var self = this;
        this.client.readdir(this.path, { recursive: false, details: true }, function(status, nodes) {
            if (self.client.isError(status))
                return cbfsgetchildren(nodes.error);

            cbfsgetchildren(null, nodes.map(function(file) {
                return file.is_dir
                    ? new jsDAV_Dropbox_Directory(file.path, self.client)
                    : new jsDAV_Dropbox_File(file.path, self.client);
            }));
        });
    };

    /**
     * Deletes all files in this directory, and then itself
     *
     * @return void
     */
    this["delete"] = function(cbfsdel) {
        var self = this;
        this.client.rm(this.path, function(status, res) {
            if (self.client.isError(status))
                cbfsdel(res.error);
            cbfsdel();
        });
    };

    /**
     * Returns available diskspace information
     *
     * @return array
     */
    this.getQuotaInfo = function(cbfsquota) {
        return cbfsquota(null, [0, 0]);
    };
}).call(jsDAV_Dropbox_Directory.prototype = new jsDAV_Dropbox_Node());
