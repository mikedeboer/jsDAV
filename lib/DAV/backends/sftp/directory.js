/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */
"use strict";

var jsDAV_SFTP_Node = require("./node");
var jsDAV_SFTP_File = require("./file");
var jsDAV_Directory = require("./../../directory");
var jsDAV_iQuota = require("./../../interfaces/iQuota");

var Async = require("asyncjs");
var Exc = require("./../../../shared/exceptions");

var jsDAV_SFTP_Directory = module.exports = jsDAV_SFTP_Node.extend(jsDAV_Directory, jsDAV_iQuota, {
    initialize: function(path, sftp) {
        this.path = (path || "").replace(/[\/]+$/, "");
        this.sftp = sftp;
    },

    /**
     * Creates a new file in the directory
     *
     * data is a readable stream resource
     *
     * @param string name Name of the file
     * @param resource data Initial payload
     * @return void
     */
    createFile: function(name, data, enc, cbfscreatefile) {
        var newPath = (this.path + "/" + name).replace(/[\/]+$/, "");
        if (data.length === 0) { //sftp lib does not support writing empty files...
            data = new Buffer("empty file");
            enc  = "binary";
        }
        this.sftp.writeFile(newPath, data, enc || "utf8", cbfscreatefile);
    },

    /**
     * Creates a new subdirectory
     *
     * @param string name
     * @return void
     */
    createDirectory: function(name, cbfscreatedir) {
        var newPath = this.path + "/" + name.replace(/[\/]+$/, "");
        this.sftp.mkdir(newPath, 0755, cbfscreatedir);
    },

    /**
     * Returns a specific child node, referenced by its name
     *
     * @param string name
     * @throws Sabre_DAV_Exception_FileNotFound
     * @return Sabre_DAV_INode
     */
    getChild: function(name, cbfsgetchild) {
        var path = (this.path + "/" + name).replace(/[\/]+$/, "");
        var self = this;

        this.sftp.stat(path, function(err, stat) {
            if (err || typeof stat == "undefined") {
                return cbfsgetchild(new Exc.jsDAV_Exception_FileNotFound("File with name "
                    + path + " could not be located"));
            }
            cbfsgetchild(null, stat.isDirectory()
                ? new jsDAV_SFTP_Directory(path, self.sftp)
                : new jsDAV_SFTP_File(path, self.sftp));
        });
    },

    /**
     * Returns an array with all the child nodes
     *
     * @return Sabre_DAV_INode[]
     */
    getChildren: function(cbfsgetchildren) {
        var nodes = [];
        var self  = this;
        this.sftp.readdir(this.path, function(err, listing) {
            if (err)
                return cbfsgetchildren(null, nodes);
            Async.list(listing)
                .each(function(node, cbnext) {
                    var path = (self.path + "/" + node).replace(/[\/]+$/, "");
                    self.sftp.stat(path, function(err, stat) {
                        if (err)
                            return cbnext();
                        nodes.push(stat.isDirectory()
                            ? new jsDAV_SFTP_Directory(path, self.sftp)
                            : new jsDAV_SFTP_File(path, self.sftp)
                        );
                        cbnext();
                    });
                })
                .end(function() {
                    cbfsgetchildren(null, nodes);
                });
        });
    },

    /**
     * Deletes all files in this directory, and then itself
     *
     * @return void
     */
    "delete": function(cbfsdel) {
        var child = this.sftp.spawn("rm -Rf '" + this.path + "'");
        var error = "";
        child.stderr.on("data", function(data){
            error += data.toString();
        });
        child.on("exit", function(){
            cbfsdel(error);
        });
    },

    /**
     * Returns available diskspace information
     *
     * @return array
     */
    getQuotaInfo: function(cbfsquota) {
        // @todo: impl. sftp.statvfs();
        return cbfsquota(null, [0, 0]);
    }
});
