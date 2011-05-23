/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright(c) 2011 Ajax.org B.V. <info AT ajax.org>
 * @author Mike de Boer <info AT mikedeboer DOT nl>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var sys = require("sys"),
    fs  = require("fs");

var s = fs.statvfsSync("/");
sys.puts("statvfsSync Free: " + formatSize(s.bfree * s.bsize) + " " + JSON.stringify(s));
var fd = fs.openSync(__filename, "r", 0666);
s = fs.fstatvfsSync(fd);
sys.puts("fstatvfsSync Free: " + formatSize(s.bfree * s.bsize) + " " + JSON.stringify(s));

fs.statvfs("/", function(err,s) {
    if (err) {
        sys.puts("statvfs error: " + err);
        return;
    }
    sys.puts("statvfs Free: " + formatSize(s.bfree * s.bsize) + " " + JSON.stringify(s));
});

fs.fstatvfs(fd, function(err,s) {
    if (err) {
        sys.puts("fstatvfs error: " + err);
        return;
    }
    sys.puts("fstatvfs Free: " + formatSize(s.bfree * s.bsize) + " " + JSON.stringify(s));
});

function formatSize(n) {
    var suffixes = ["b","kb","mb","gb","tb"],
        index    = 0;
    while (n > 768 && index + 1 < suffixes.length) {
        n /= 1024;
        index++;
    }
    return n + suffixes[index];
}
