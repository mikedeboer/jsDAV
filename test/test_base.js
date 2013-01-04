var Assert = require("assert");
var Base = require("./../lib/shared/base");

var jsDAV_FS_Directory = require("./../lib/DAV/backends/fs/directory");
var jsDAV_FS_File = require("./../lib/DAV/backends/fs/file");

// interfaces for directories:
var jsDAV_Directory = require("./../lib/DAV/directory");
var jsDAV_iQuota = require("./../lib/DAV/interfaces/iQuota");
var jsDAV_iCollection = require("./../lib/DAV/interfaces/iCollection");

// interfaces for directories:
var jsDAV_File = require("./../lib/DAV/file");
var jsDAV_iFile = require("./../lib/DAV/interfaces/iFile");

// interfaces that have nothing to do with files or directories:
var jsDAV_iHref = require("./../lib/DAV/interfaces/iHref");

// test dir properties
var dir = jsDAV_FS_Directory.new("somepath/to/a/dir");
Assert.ok(dir.hasFeature(jsDAV_Directory));
Assert.ok(dir.hasFeature(jsDAV_iQuota));
Assert.ok(dir.hasFeature(jsDAV_iCollection));

Assert.ok(!dir.hasFeature(jsDAV_File));
Assert.ok(!dir.hasFeature(jsDAV_iFile));
Assert.ok(!dir.hasFeature(jsDAV_iHref));

// test file properties
var file = jsDAV_FS_File.new("somepath/to/a/file");
Assert.ok(file.hasFeature(jsDAV_File));
Assert.ok(file.hasFeature(jsDAV_iFile));

Assert.ok(!file.hasFeature(jsDAV_Directory));
Assert.ok(!file.hasFeature(jsDAV_iQuota));
Assert.ok(!file.hasFeature(jsDAV_iCollection));
Assert.ok(!file.hasFeature(jsDAV_iHref));

// re-test dir properties
Assert.ok(dir.hasFeature(jsDAV_Directory));
Assert.ok(dir.hasFeature(jsDAV_iQuota));
Assert.ok(dir.hasFeature(jsDAV_iCollection));

Assert.ok(!dir.hasFeature(jsDAV_File));
Assert.ok(!dir.hasFeature(jsDAV_iFile));
Assert.ok(!dir.hasFeature(jsDAV_iHref));