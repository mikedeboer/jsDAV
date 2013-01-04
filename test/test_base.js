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

Assert.ok(dir.UUIDS, dir.UUID & jsDAV_File.UUID, !dir.hasFeature(jsDAV_File));
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

// Basic test (form the documentation of Base)
// ### Object composition ###

var HEX = Base.extend({
   hex: function hex() {
       return "#" + this.color;
   }
});

var RGB = Base.extend({
   red: function red() {
       return parseInt(this.color.substr(0, 2), 16);
   },
   green: function green() {
       return parseInt(this.color.substr(2, 2), 16);
   },
   blue: function blue() {
       return parseInt(this.color.substr(4, 2), 16);
   }
});

var CMYK = Base.extend(RGB, {
   black: function black() {
       var color = Math.max(Math.max(this.red(), this.green()), this.blue());
       return (1 - color / 255).toFixed(4);
   },
   cyan: function cyan() {
       var K = this.black();
       return (((1 - this.red() / 255).toFixed(4) - K) / (1 - K)).toFixed(4);
   },
   magenta: function magenta() {
       var K = this.black();
       return (((1 - this.green() / 255).toFixed(4) - K) / (1 - K)).toFixed(4);
   },
   yellow: function yellow() {
       var K = this.black();
       return (((1 - this.blue() / 255).toFixed(4) - K) / (1 - K)).toFixed(4);
   }
});

var Color = Base.extend(HEX, RGB, CMYK, {
   initialize: function Color(color) {
       this.color = color;
   }
});

// ### Prototypal inheritance ###

var Pixel = Color.extend({
   initialize: function Pixel(x, y, hex) {
       Color.initialize.call(this, hex);
       this.x = x;
       this.y = y;
   },
   toString: function toString() {
       return this.x + ":" + this.y + "@" + this.hex();
   }
});

var pixel = Pixel.new(11, 23, "CC3399");
Assert.equal(pixel.toString(), "11:23@#CC3399");

Assert.equal(pixel.red(), 204);
Assert.equal(pixel.green(), 51);
Assert.equal(pixel.blue(), 153);

Assert.equal(pixel.cyan(), 0.0000);
Assert.equal(pixel.magenta(), 0.7500);
Assert.equal(pixel.yellow(), 0.250);

// an instance of Color should contain the following objects:
var color = Color.new("CC3399");
Assert.ok(color.hasFeature(HEX)); // true
Assert.ok(color.hasFeature(RGB)); // true
Assert.ok(color.hasFeature(CMYK)); // true
Assert.ok(color.hasFeature(Color)); // true
Assert.ok(!color.hasFeature(Pixel)); // false

// an instance of Pixel should contain the following objects:
var pixel = Pixel.new(11, 23, "CC3399");
Assert.ok(pixel.hasFeature(HEX)); // true
Assert.ok(pixel.hasFeature(RGB)); // true
Assert.ok(pixel.hasFeature(CMYK)); // true
Assert.ok(pixel.hasFeature(Color)); // true
