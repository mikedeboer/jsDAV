var jsDAV_Tree         = require("./../tree").jsDAV_Tree,
    jsDAV_FS_Directory = require("./../fs/directory").jsDAV_FS_Directory,
    jsDAV_FS_File      = require("./../fs/file").jsDAV_FS_File,

    Util               = require("./../util"),
    Exc                = require("./../exceptions");

/**
 * jsDAV_Tree_Filesystem
 *
 * Creates this tree
 * Supply the path you'd like to share.
 *
 * @param {String} basePath
 * @contructor
 */
function jsDAV_Tree_Filesystem(basePath) {
    this.basePath = basePath;
}

exports.jsDAV_Tree_Filesystem = jsDAV_Tree_Filesystem;

(function() {
    /**
     * Returns a new node for the given path
     *
     * @param string path
     * @return void
     */
    this.getNodeForPath = function(path) {
        var realPath = this.getRealPath(path);
        if (!file_exists(realPath))
            throw new Exc.jsDAV_Exception_FileNotFound("File at location " + realPath + " not found");
        if (is_dir(realPath)) {
            return new jsDAV_FS_Directory(path);
        }
        else {
            return new jsDAV_FS_File(path);
        }
    }

    /**
     * Returns the real filesystem path for a webdav url.
     *
     * @param string publicPath
     * @return string
     */
    this.getRealPath = function(publicPath) {
        return Util.rtrim(this.basePath, "/") + "/" + Util.trim(publicPath, "/");
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
    this.copy = function(source, destination) {
        source = this.getRealPath(source);
        destination = this.getRealPath(destination);
        this.realCopy(source,destination);
    };

    /**
     * Used by self::copy
     *
     * @param string source
     * @param string destination
     * @return void
     */
    this.realCopy = function(source, destination) {
        if (is_file(source)) {
            copy(source,destination);
        }
        else {
            mkdir(destination);
            var subnode,
                list = scandir(source),
                i    = 0,
                l    = list.length;
            for (; i < l; ++i) {
                subnode = list[i];
                if (subnode == "." || subnode == "..") continue;
                this.realCopy(source + "/" + subnode, destination + "/" + subnode);
            }
        }
    };

    /**
     * Moves a file or directory recursively.
     *
     * If the destination exists, delete it first.
     *
     * @param string source
     * @param string destination
     * @return void
     */
    this.move = function(source, destination) {
        source = this.getRealPath(source);
        destination = this.getRealPath(destination);
        rename(source, destination);
    };
}).call(jsDAV_Tree_Filesystem.prototype = new jsDAV_Tree());