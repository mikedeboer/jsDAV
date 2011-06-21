/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV       = require("./../../jsdav"),
    jsDAV_iNode = require("./../iNode").jsDAV_iNode,
    jsDav_iProperties = require("./../iProperties").jsDAV_iProperties,
    
    Fs          = require("fs"),
    Path        = require("path"),
    Util        = require("./../util"),
    Exc         = require("./../exceptions");

function jsDAV_Ftp_Node(path, ftp) {
    this.path = (path || "").replace(/[\/]+$/, "");
    this.ftp = ftp;
}

exports.jsDAV_Ftp_Node = jsDAV_Ftp_Node;

(function() {
    this.implement(jsDav_iProperties);
    
    this.updateProperties = function(path, properties, callback) {
        console.log("##########", arguments);
        
        for (p in properties) {
            if (p == "permissions") {
                this.ftp.chmod(path, properties[p], function(err) {
                    callback(null, "");
                });
            }
        }
    };
    
    this.getProperties = function(path) {
        this.ftp.stat(path, function(err, stat) {
            callback(err, stat.rights);
        });
    }
    
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
    this.setName = function(name, cbftpsetname) {
        var parentPath = Util.splitPath(this.path)[0],
            newName    = Util.splitPath(name)[1];

        var newPath = parentPath + "/" + newName;
        var self = this;
        this.ftp.rename(this.path, newPath, function(err) {
            if (err)
                return cbftpsetname(err);
            
            self.path = newPath;
            cbftpsetname();
        });
    };

    /**
     * Returns the last modification time, as a unix timestamp
     *
     * @return {Number}
     */
    this.getLastModified = function(cbftpgetlm) {
        if (this.hasFeature(jsDAV.__ICOLLECTION__))
            this.$getLastModifiedDir(cbftpgetlm);
        else {
            var self = this;
            var lastMod = this.ftp.lastMod(this.path, function(err, mod) {
                if (err) {
                    return (err.code === 500)
                        ? self.getLastModifiedDir(cbftpgetlm)
                        : cbftpgetlm(err);
                }

                cbftpgetlm(null, mod.toString());
            });
            if(!lastMod)
                cbftpgetlm(null, null);
        }
    };
    
    this.$getLastModifiedDir = function(cbftpgetlmdir) {
        if (this.$isRoot()) {
            /** Last modification date can't be figured out for root node, because there isn't one.
              * Therefore, return a past date to force update. */
            return cbftpgetlmdir(null, new Date(0).toString()); // Thu Jan 01 1970 01:00:00
        }
        
        this.ftp.stat(this.path, function(err, stat) {
            if (err)
                return cbftpgetlmdir(err);
                
            cbftpgetlmdir(null, stat.getLastMod().toString());
        });
    };
    
    this.$isRoot = function() {
        return this.path === "";
    };

    /**
     * Returns whether a node exists or not
     *
     * @return {Boolean}
     */
    this.exists = function(cbftpexist) {
        if (self.ftp.$cache[this.path])
            return cbftpexist(true);
        
        this.ftp.stat(this.path, function(err, stat) {
            cbftpexist(Boolean(!err && stat))
        });
    };
}).call(jsDAV_Ftp_Node.prototype = new jsDAV_iNode());
