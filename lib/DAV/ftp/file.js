/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax DOT org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV           = require("./../../jsdav"),
    jsDAV_Ftp_Node = require("./node").jsDAV_Ftp_Node,
    jsDAV_Directory = require("./../directory").jsDAV_Directory,
    jsDAV_iFile     = require("./../iFile").jsDAV_iFile,

    Fs              = require("fs"),
    Exc             = require("./../exceptions"),
    Util            = require("./../util");

function jsDAV_Ftp_File(path, ftp) {
    this.path = (path || "").replace(/[\/]+$/, "");
    this.ftp = ftp;
}

exports.jsDAV_Ftp_File = jsDAV_Ftp_File;

(function() {
    this.implement(jsDAV_iFile);

    /**
     * Creates or updates the data for a node file
     *
     * @param {mixed} data
     * @return void
     */
    this.put = function(data, type, cbfsput) {
        type  = type || "utf8";
        var temp  = this.ftp.tmpDir + "/" + Util.uuid(),
            self = this;

        Fs.writeFile(temp, data, type, function(err) {
            if (err)
                return cbfsput(err);
                
            self.$realPut(temp, function(err) {
                if (err)
                    return err;
                Fs.unlink(temp, function(err) {
                    if (err)
                        return cbfsput(err);
                        
                    cbfsput(null);
                });
            });
        });
    };
    
    this.$realPut = function(tempPath, next) {
        var inStream = Fs.createReadStream(tempPath);
        this.ftp.put(inStream, this.path, function(err) {
            next(err);
        });
    };

    /**
     * Returns the data
     *
     * @return Buffer
     */
    this.get = function(cbfsfileget) {
        var self  = this;
        this.ftp.get(this.path, function(err, stream) {
            if (err)
                return cbfsfileget(err);
            
            stream.on('error', function(e) {
                cbfsfileget(new Exc.jsDAV_Exception("File at location "
                    + self.path + " could not be retrieved"));
            });
            stream.on('success', function() {
                Fs.readFile(temp, function(err, data) {
                    if (err)
                        return cbfsfileget(err);
                    Fs.unlink(temp, function() {
                        if (err)
                            return cbfsfileget(err);
                        cbfsfileget(null, data);
                    });
                });
            });
            var temp = self.ftp.tmpDir + "/" + Util.uuid();
            stream.pipe(Fs.createWriteStream(temp));
        });
    };

    /**
     * Delete the current file
     *
     * @return void
     */
    this["delete"] = function(cbfsfiledel) {
        this.ftp['delete'](this.path, function(err){
            if (err)
                return cbfsfiledel(new Exc.jsDAV_Exception_FileNotFound("File at location " 
                    + self.path + " not found"));
            
            delete self.ftp.$cache[self.path];
            cbfsfiledel(null);
        });
    };

    /**
     * Returns the size of the node, in bytes
     *
     * @return int
     */
    this.getSize = function(cbfsgetsize) {
        var self = this;
        this.ftp.size(this.path, function(err, size) {
            if (err || !size) {
                return cbfsgetsize(new Exc.jsDAV_Exception_FileNotFound("File at location " 
                    + self.path + " not found"));
            }
            cbfsgetsize(null, size);
        });
    };

    /**
     * Returns the ETag for a file
     * An ETag is a unique identifier representing the current version of the file.
     * If the file changes, the ETag MUST change.
     * Return null if the ETag can not effectively be determined
     *
     * @return mixed
     */
    this.getETag = function(cbfsgetetag) {
        cbfsgetetag(null, null);
    };

    /**
     * Returns the mime-type for a file
     * If null is returned, we'll assume application/octet-stream
     *
     * @return mixed
     */
    this.getContentType = function(cbfsmime) {
        return cbfsmime(null, Util.mime.type(this.path));
    };
}).call(jsDAV_Ftp_File.prototype = new jsDAV_Ftp_Node());
