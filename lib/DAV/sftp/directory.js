/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV             = require("./../../jsdav"),
    jsDAV_SFTP_Node   = require("./node").jsDAV_SFTP_Node,
    jsDAV_SFTP_File   = require("./file").jsDAV_SFTP_File,
    jsDAV_Directory   = require("./../directory").jsDAV_Directory,
    jsDAV_iCollection = require("./../iCollection").jsDAV_iCollection,
    jsDAV_iQuota      = require("./../iQuota").jsDAV_iQuota,

    Fs                = require("fs"),
    Async             = require("./../../../support/async.js"),
    Exc               = require("./../exceptions");

function jsDAV_SFTP_Directory(path, sftp) {
    this.path = (path || "").replace(/[\/]+$/, "");
    this.sftp = sftp;
}

exports.jsDAV_SFTP_Directory = jsDAV_SFTP_Directory;

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
        var newPath = (this.path + "/" + name).replace(/[\/]+$/, "");
        if (data.length === 0) { //sftp lib does not support writing empty files...
            data = new Buffer("empty file");
            enc  = "binary";
        }
        this.sftp.writeFile(newPath, data, enc || "utf8", cbfscreatefile);
    };

    /**
     * Creates a new subdirectory
     *
     * @param string name
     * @return void
     */
    this.createDirectory = function(name, cbfscreatedir) {
        var newPath = this.path + "/" + name.replace(/[\/]+$/, "");
        this.sftp.mkdir(newPath, 0755, cbfscreatedir);
    };

    /**
     * Returns a specific child node, referenced by its name
     *
     * @param string name
     * @throws Sabre_DAV_Exception_FileNotFound
     * @return Sabre_DAV_INode
     */
    this.getChild = function(name, cbfsgetchild) {
        var path  = (this.path + "/" + name).replace(/[\/]+$/, ""),
            _self = this;

        this.sftp.stat(path, function(err, stat) {
            if (err || typeof stat == "undefined") {
                return cbfsgetchild(new Exc.jsDAV_Exception_FileNotFound("File with name "
                    + path + " could not be located"));
            }
            cbfsgetchild(null, stat.isDirectory()
                ? new jsDAV_SFTP_Directory(path, _self.sftp)
                : new jsDAV_SFTP_File(path, _self.sftp));
        });
    };

    /**
     * Returns an array with all the child nodes
     *
     * @return Sabre_DAV_INode[]
     */
    this.getChildren = function(cbfsgetchildren) {
        var nodes = [],
            _self = this;
        this.sftp.readdir(this.path, function(err, listing) {
            if (err)
                return cbfsgetchildren(null, nodes);
            Async.list(listing)
                .each(function(node, cbnext) {
                    var path = (_self.path + "/" + node).replace(/[\/]+$/, "");
                    _self.sftp.stat(path, function(err, stat) {
                        if (err)
                            return cbnext();
                        nodes.push(stat.isDirectory()
                            ? new jsDAV_SFTP_Directory(path, _self.sftp)
                            : new jsDAV_SFTP_File(path, _self.sftp)
                        );
                        cbnext();
                    });
                })
                .end(function() {
                    cbfsgetchildren(null, nodes);
                });
        });
    };

    /**
     * Deletes all files in this directory, and then itself
     *
     * @return void
     */
    this["delete"] = function(cbfsdel) {
        console.log("rm -Rf '" + this.path + "'");
        var child = this.sftp.spawn("rm -Rf '" + this.path + "'");
        var error = '';
        child.stderr.on('data', function(data){
            error += data.toString();
        });
        child.on('exit', function(){
            cbfsdel(error);
        });
    };

    /**
     * Returns available diskspace information
     *
     * @return array
     */
    this.getQuotaInfo = function(cbfsquota) {
        // @todo: impl. sftp.statvfs();
        return cbfsquota(null, [0, 0]);
    };
}).call(jsDAV_SFTP_Directory.prototype = new jsDAV_SFTP_Node());
