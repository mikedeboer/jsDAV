var jsDAV       = require("./../jsdav"),
    jsDAV_iNode = require("./../iNode").jsDAV_iNode,

    Util        = require("./../util"),
    Exc         = require("./../exceptions");

function jsDAV_FS_Node(path) {
    this.path = path;
}

exports.jsDAV_FS_Node = jsDAV_FS_Node;

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
    this.setName = function(name, callback) {
        var parentPath = Util.splitPath(this.path)[0],
            newName    = Util.splitPath(name)[1];

        var newPath = parentPath + "/" + newName;
        rename(this.path, newPath);

        this.path = newPath;
    };

    /**
     * Returns the last modification time, as a unix timestamp
     *
     * @return {Number}
     */
    this.getLastModified = function(callback) {
        return filemtime(this.path);
    };
}).call(jsDAV_FS_Node.prototype = new jsDAV_iNode());
