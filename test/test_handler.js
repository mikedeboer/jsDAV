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

	if (path === "" || path == "/") {
		return pwd;
	}

	var parts = path.split("/");

	for (var i = 0; i < parts.length; i++) {
		var part = parts[i];

		if (pwd.contents[part]) {
			pwd = pwd.contents[part];
		} else {
			return null;
		}
	};

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
		console.log("is folder", path, "not found");
	} else {
		cb(null, pwd.type == "folder");
	}
};

Handler.prototype.exists = function (path, cb) {
	var pwd = this.getNode(path);

	console.log("path exists", path, pwd !== null);
	cb(null, pwd !== null);
};

Handler.prototype.createFolder = function (path, cb) {
	path = path.split("/");
	var folder = path.pop();
	path = path.join("/");

	console.log("create folder", path, folder);

	var pwd = this.getNode(path);

	if (!pwd) {
		cb("Path not found");
	} else {
		if (pwd.contents[folder]) {
			return cb("Path already exists");
		}

		pwd.contents[folder] = {type: "folder", contents: []};
		cb(null);
	}
};

Handler.prototype.getFile = function (path, cb) {
	console.log("get file", path);

	var pwd = this.getNode(path);
	
	if (!pwd || pwd.type != "file") {
		cb("file not found");
		console.log("file size not found");
	} else {
		cb(null, pwd.contents);
	}
};

Handler.prototype.getFileSize = function (path, cb) {
	console.log("get file size", path);

	var pwd = this.getNode(path);

	if (!pwd || pwd.type != "file") {
		cb("file not found");
		console.log("file size not found");
	} else {
		cb(null, pwd.contents.length);
	}
};

Handler.prototype.getLastModified = function (path, cb) {
	console.log("get last modified", path);
	var pwd = this.getNode(path);

	if (!pwd) {
		cb("file not found");
		console.log("file last modified not found");
	} else {
		if (!pwd.lastMod) {
			pwd.lastMod = new Date().toUTCString();
		}

		cb(null, pwd.lastMod);
	}
};

Handler.prototype.renameFile = function (oldPath, newPath, cb) {
	console.log("rename file", oldPath, newPath);
	cb(null, "renamed file");
};

Handler.prototype.putFile = function (path, data, cb) {
	path = path.split("/");
	var file = path.pop();
	path = path.join("/");

	console.log("put file", path, file, data);

	var pwd = this.getNode(path);

	if (!pwd) {
		cb("Path not found");
	} else {
		if (!pwd.contents[file]) {
			pwd.contents[file] = {type: "file"};
		}

		pwd.lastMod = new Date().toUTCString();
		pwd.contents[file].contents = data.toString();
		cb("saved");
	}
};

Handler.prototype.deleteFile = function (path, cb) {
	console.log("delete file", path);

	path = path.split("/");
	var file = path.pop();
	path = path.join("/");

	var pwd = this.getNode(path);

	if(!pwd) {
		cb("Path not found");
	} else {
		delete pwd.contents[file];
		cb(null);
	}
};

Handler.prototype.deleteFolder = function (path, cb) {
	console.log("delete folder", path);

	path = path.split("/");
	var folder = path.pop();
	path = path.join("/");

	var pwd = this.getNode(path);

	if(!pwd) {
		cb("Path not found");
	} else {
		delete pwd.contents[folder];
		cb(null);
	}
};

jsDAV.createServer({
	type: "eventHandler",
	eventHandler: new Handler()
}, 8000);
