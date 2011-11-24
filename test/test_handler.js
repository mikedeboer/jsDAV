/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Kevin Smith
 * @author Kevin Smith <@respectTheCode>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV = require("./../lib/jsdav");

//jsDAV.debugMode = true;

var Handler = function () {
	this.urser = {
		"kevin": {pass: "abc", path: /[.]*/},
		"test": {pass: "test", path: /^(test)/}
	};

	this.fs = {type: "folder", contents: {
		"a": {type: "folder", contents: {
			"aa": {type: "folder", contents: {}},
			"a1.txt": {type: "file", contents: "this is file 1"}
		}},	
		"b": {type: "folder", contents: {
			"ba": {type: "folder", contents: {
				"ba1.txt": {type: "file", contents: "this is file 3"}
			}},
			"b1.txt": {type: "file", contents: "this is file 2"}
		}},
		"1.txt": {type: "file", contents: "this is file 2"}
	}};
};

Handler.prototype.authenticate = function (Handler, user, pass, cb) {
	if (this.users[user] && this.users[user].pass == pass) {
		cb(null, this.users[user].path.test(path));
	} else {
		cb(null, false);
	}
};

Handler.prototype.getSpace = function (path, cb) {
	cb(null, 100, 1024);
};

Handler.prototype.getNode = function (path) {
	var pwd = this.fs;

	console.log("getNode", path, path.split("/"));

	if (path === "" || path == "/") {
		return pwd;
	}

	path.split("/").forEach(function (part) {
		if (pwd.contents[part]) {
			pwd = pwd.contents[part];
		} else {
			return null;
		}
	});

	console.log("--Got node", pwd);

	return pwd;
};

Handler.prototype.ls = function (path, cb) {
	var pwd = this.getNode(path);

	var folders = [];
	var files = [];

	for (var name in pwd.contents) {
		var node = pwd.contents[name];

		if (node.type == "folder") {
			folders.push(name);
		} else {
			files.push(name);
		}
	};
	
	cb(null, folders, files);
};

Handler.prototype.isFolder = function (path, cb) {
	var pwd = this.getNode(path);

	if (!pwd) {
		cb("Path not found");
	} else {
		cb(null, pwd.type == "folder");
	}
};

Handler.prototype.exists = function (path, cb) {
	var pwd = this.getNode(path);

	cb(null, pwd !== null);
};

Handler.prototype.createFolder = function (path, cb) {
	console.log("create folder", path);
	cb(null, "Created folder?");
};

Handler.prototype.getFile = function (path, cb) {
	console.log("get file", path);
	cb(null, "This is a file");
};

Handler.prototype.getFileSize = function (path, cb) {
	console.log("get file size");
	cb(null, "This is a file".length);
};

Handler.prototype.getLastModified = function (path, cb) {
	console.log("get last modified", path);
	cb(null, new Date().getTime());
};

Handler.prototype.renameFile = function (oldPath, newPath, cb) {
	console.log("rename file", oldPath, newPath);
	cb(null, "renamed file");
};

Handler.prototype.putFile = function (path, data, cb) {
	console.log("put file", path);
	cb(null);
};

Handler.prototype.deleteFile = function (path, cb) {
	console.log("delete file", path);
	cb(null);
};

Handler.prototype.deleteFolder = function (path, cb) {
	console.log("delete folder", path);
	cb(null);
};

jsDAV.createServer({
	type: "eventHandler",
	eventHandler: new Handler()
}, 8000);
